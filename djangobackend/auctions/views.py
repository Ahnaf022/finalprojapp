import os
from decimal import Decimal
from typing import Any

from rest_framework import generics, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AuctionEvent, AuctionItem, UserProfile
from .serializers import (
    AuctionEventSerializer,
    AuctionItemSerializer,
    UserProfileSerializer,
    profile_display_map_for_subs,
)
from .authentication import CognitoJWTAuthentication
from .seed import ensure_seed_data


class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = getattr(request, "user", None)
        user_sub = getattr(user, "sub", None)
        return bool(user_sub) and getattr(obj, "owner_sub", None) == user_sub


class ProfileDisplayContextMixin:
    """Attach profile display_name map for serializer read-only display fields."""

    def get_serializer_context(self):
        context = super().get_serializer_context()
        qs = self.filter_queryset(self.get_queryset())
        if self.serializer_class is AuctionEventSerializer:
            subs = set(qs.values_list("created_by_sub", flat=True))
        elif self.serializer_class is AuctionItemSerializer:
            subs = set()
            for row in qs.values("owner_sub", "sold_to_sub"):
                subs.add(row["owner_sub"])
                if row["sold_to_sub"]:
                    subs.add(row["sold_to_sub"])
        else:
            return context
        context["profile_display_by_sub"] = profile_display_map_for_subs(subs)
        return context


class UserProfileMeView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/profile/me/ - current user's profile (creates row on first access).
    """

    serializer_class = UserProfileSerializer
    authentication_classes = [CognitoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _default_display_name(self):
        user = self.request.user
        email = getattr(user, "email", None) or getattr(user, "username", None)
        if email and "@" in email:
            return email.split("@")[0][:150]
        if email:
            return str(email)[:150]
        return ""

    def get_object(self):
        sub = self.request.user.sub
        profile, _ = UserProfile.objects.get_or_create(
            cognito_sub=sub,
            defaults={"display_name": self._default_display_name()},
        )
        return profile


class AuctionEventViewSet(ProfileDisplayContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing AuctionEvent instances.
    
    Supports:
    - GET /api/auctionEvent/ - List all events
    - POST /api/auctionEvent/ - Create new event
    - GET /api/auctionEvent/{id}/ - Retrieve specific event
    - PUT /api/auctionEvent/{id}/ - Full update of event
    - PATCH /api/auctionEvent/{id}/ - Partial update of event
    - DELETE /api/auctionEvent/{id}/ - Delete event
    """
    queryset = AuctionEvent.objects.order_by("start_datetime", "id")
    serializer_class = AuctionEventSerializer
    authentication_classes = [CognitoJWTAuthentication]
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by_sub=getattr(self.request.user, "sub", None))
    
    def update(self, request, *args, **kwargs):
        """Handle PUT requests for full update."""
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Handle DELETE requests."""
        return super().destroy(request, *args, **kwargs)


class AuctionItemViewSet(ProfileDisplayContextMixin, viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing AuctionItem instances.

    Supports:
    - GET /api/auctionItem/ - List all items
    - POST /api/auctionItem/ - Create new item
    - GET /api/auctionItem/{id}/ - Retrieve specific item
    - PUT /api/auctionItem/{id}/ - Full update of item
    - PATCH /api/auctionItem/{id}/ - Partial update of item
    - DELETE /api/auctionItem/{id}/ - Delete item
    """
    queryset = AuctionItem.objects.select_related('auction_event').all()
    serializer_class = AuctionItemSerializer
    authentication_classes = [CognitoJWTAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        ensure_seed_data()
        return AuctionEvent.objects.order_by("start_datetime", "id")

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrReadOnly()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # Serializer marks `current_price` read-only, but the DB requires it.
        # Set it server-side to the starting price on create.
        starting_price = serializer.validated_data.get("starting_price")
        serializer.save(
            owner_sub=getattr(self.request.user, "sub", None),
            current_price=starting_price,
        )


class GenerateAuctionItemDescriptionView(APIView):
    """
    POST /api/ai/generate-item-description/

    Body: { "name": "Item name" }
    Response: { "description": "..." }

    Auth: required (demo bearer token).
    """

    authentication_classes = [CognitoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get("name")
        if not isinstance(name, str) or not name.strip():
            return Response(
                {"detail": "Missing required field: name"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prompt_name = name.strip()[:200]
        description = (
            f"{prompt_name} is available for this auction event. "
            "Condition not specified. Please review the item details before placing a bid."
        )
        return Response({"description": description}, status=status.HTTP_200_OK)


class CreateCheckoutSessionView(APIView):
    """
    POST /api/payments/create-checkout-session/

    Body: { "auction_item_id": <int>, "customer_email": "<optional>" }

    Creates a Stripe Checkout Session (test mode) and returns { "checkout_url": "..." }.
    Open that URL in a browser to complete payment (class demo / POC).

    Configure STRIPE_SECRET_KEY and checkout redirect URLs in the environment
    (see .env.example). Do not commit API keys.
    """

    authentication_classes: list[Any] = [CognitoJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            import stripe
        except ImportError:
            return Response(
                {"detail": "Python package 'stripe' is not installed. See djangobackend/requirements.txt."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        secret = os.environ.get("STRIPE_SECRET_KEY")
        if not secret:
            return Response(
                {"detail": "STRIPE_SECRET_KEY is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        success_url = os.environ.get("STRIPE_CHECKOUT_SUCCESS_URL", "").strip()
        cancel_url = os.environ.get("STRIPE_CHECKOUT_CANCEL_URL", "").strip()
        if not success_url or not cancel_url:
            return Response(
                {
                    "detail": (
                        "Set STRIPE_CHECKOUT_SUCCESS_URL and STRIPE_CHECKOUT_CANCEL_URL "
                        "in the server environment (see .env.example)."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        raw_id = request.data.get("auction_item_id")
        try:
            item_id = int(raw_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid or missing auction_item_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = AuctionItem.objects.select_related("auction_event").get(pk=item_id)
        except AuctionItem.DoesNotExist:
            return Response(
                {"detail": "Auction item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if item.status != "published":
            return Response(
                {"detail": "This item is not available for purchase."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unit_amount = int(Decimal(str(item.current_price)) * 100)
        # Stripe USD card payments typically enforce a $0.50 minimum.
        if unit_amount < 50:
            return Response(
                {"detail": "Item price is below the minimum charge amount for checkout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer_email = request.data.get("customer_email")
        if customer_email is not None and not isinstance(customer_email, str):
            return Response(
                {"detail": "customer_email must be a string when provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        email_stripped = customer_email.strip() if isinstance(customer_email, str) else ""
        if email_stripped and "@" not in email_stripped:
            return Response(
                {"detail": "customer_email does not look valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.api_key = secret

        event_label = ""
        if item.auction_event:
            event_label = (item.auction_event.name or "")[:200]

        product_name = item.name[:200]
        if event_label:
            product_name = f"{product_name} ({event_label})"[:200]

        desc = (item.description or "").strip()
        if len(desc) > 500:
            desc = desc[:497] + "..."

        params: dict[str, Any] = {
            "mode": "payment",
            "line_items": [
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": unit_amount,
                        "product_data": {
                            "name": product_name,
                            **({"description": desc} if desc else {}),
                        },
                    },
                    "quantity": 1,
                }
            ],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {
                "auction_item_id": str(item.id),
                "auction_event_id": str(item.auction_event_id),
            },
        }
        if email_stripped:
            params["customer_email"] = email_stripped[:254]

        try:
            session = stripe.checkout.Session.create(**params)
        except stripe.error.StripeError as e:
            return Response(
                {"detail": f"Stripe error: {str(e).strip() or e.__class__.__name__}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not session.url:
            return Response(
                {"detail": "Stripe did not return a checkout URL."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"checkout_url": session.url}, status=status.HTTP_200_OK)
