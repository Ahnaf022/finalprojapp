import base64
import hashlib
import json
from typing import Any

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


def _base64url_decode(segment: str) -> dict[str, Any]:
    padded = segment + "=" * (-len(segment) % 4)
    try:
        raw = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        payload = json.loads(raw)
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise AuthenticationFailed("Invalid demo auth token.") from exc
    if not isinstance(payload, dict):
        raise AuthenticationFailed("Invalid demo auth payload.")
    return payload


def _sub_for_email(email: str) -> str:
    digest = hashlib.sha256(email.lower().encode("utf-8")).hexdigest()[:24]
    return f"demo-{digest}"


class DemoUser:
    def __init__(self, claims: dict[str, Any]):
        email = claims.get("email")
        preferred_username = claims.get("preferred_username")

        self.claims = claims
        self.sub = claims.get("sub")
        self.username = (
            preferred_username
            if isinstance(preferred_username, str) and preferred_username.strip()
            else email
        )

    @property
    def email(self) -> str | None:
        value = self.claims.get("email")
        return value if isinstance(value, str) else None

    @property
    def is_authenticated(self) -> bool:
        return True

    def __str__(self) -> str:
        return self.username or self.sub or "DemoUser"


class CognitoJWTAuthentication(BaseAuthentication):
    """
    Demo-friendly bearer token authentication.

    The frontend issues unsigned JWT-shaped tokens whose payload includes a stable
    `sub` and `email`. This keeps the existing API contract intact while fully
    bypassing Cognito for solo-project demos.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "").strip()
        if not auth_header:
            return None

        scheme, _, token = auth_header.partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            raise AuthenticationFailed("Expected a Bearer token.")

        token = token.strip()
        claims: dict[str, Any]

        if token == "mock-token":
            claims = {
                "sub": _sub_for_email("demo@example.com"),
                "email": "demo@example.com",
                "preferred_username": "demo",
            }
        else:
            parts = token.split(".")
            if len(parts) < 2:
                raise AuthenticationFailed("Invalid demo auth token.")
            claims = _base64url_decode(parts[1])

        email = claims.get("email")
        sub = claims.get("sub")

        if not isinstance(email, str) or not email.strip():
            raise AuthenticationFailed("Demo auth token is missing an email.")

        if not isinstance(sub, str) or not sub.strip():
            claims["sub"] = _sub_for_email(email)

        if "preferred_username" not in claims or not isinstance(
            claims.get("preferred_username"), str
        ):
            claims["preferred_username"] = email.split("@")[0]

        return (DemoUser(claims), None)
