from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import AuctionEvent, AuctionItem, UserProfile


def ensure_seed_data() -> None:
    """
    Populate a small demo dataset only when the database is completely empty.

    This keeps first-run demos from landing on blank events/items pages while
    leaving any real user-created data untouched.
    """

    if AuctionEvent.objects.exists() or AuctionItem.objects.exists():
        return

    with transaction.atomic():
        if AuctionEvent.objects.exists() or AuctionItem.objects.exists():
            return

        sample_profiles = [
            ("demo-seller-alice", "Alice"),
            ("demo-seller-bob", "Bob"),
            ("demo-seller-carol", "Carol"),
        ]
        for sub, display_name in sample_profiles:
            UserProfile.objects.get_or_create(
                cognito_sub=sub,
                defaults={"display_name": display_name},
            )

        now = timezone.now()

        spring_event = AuctionEvent.objects.create(
            name="Campus Spring Auction",
            city="Columbus",
            state="OH",
            zip_code="43210",
            start_datetime=now + timedelta(days=1),
            end_datetime=now + timedelta(days=1, hours=4),
            created_by_sub="demo-seller-alice",
            is_active=True,
        )
        tech_event = AuctionEvent.objects.create(
            name="Student Tech Swap",
            city="Cleveland",
            state="OH",
            zip_code="44114",
            start_datetime=now + timedelta(days=3),
            end_datetime=now + timedelta(days=3, hours=6),
            created_by_sub="demo-seller-bob",
            is_active=True,
        )

        AuctionItem.objects.bulk_create(
            [
                AuctionItem(
                    auction_event=spring_event,
                    name="Mini Fridge",
                    description="Compact dorm mini fridge in working condition.",
                    owner_sub="demo-seller-alice",
                    starting_price=Decimal("40.00"),
                    current_price=Decimal("40.00"),
                    status="published",
                ),
                AuctionItem(
                    auction_event=spring_event,
                    name="Desk Lamp",
                    description="LED desk lamp with adjustable brightness.",
                    owner_sub="demo-seller-carol",
                    starting_price=Decimal("12.00"),
                    current_price=Decimal("12.00"),
                    status="published",
                ),
                AuctionItem(
                    auction_event=tech_event,
                    name='TI-84 Calculator',
                    description="Graphing calculator ready for the next semester.",
                    owner_sub="demo-seller-bob",
                    starting_price=Decimal("55.00"),
                    current_price=Decimal("55.00"),
                    status="published",
                ),
            ]
        )
