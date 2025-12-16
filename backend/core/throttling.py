"""
Custom throttling classes for rate limiting.
"""
from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """
    Rate throttle for login attempts.
    Limits by IP address to prevent brute force attacks.
    """
    scope = 'login'

    def get_cache_key(self, request, view):
        # Throttle by IP address for login attempts
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class AIRateThrottle(SimpleRateThrottle):
    """
    Rate throttle for AI API calls.
    More restrictive since AI calls are expensive.
    """
    scope = 'ai'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class BurstRateThrottle(SimpleRateThrottle):
    """
    Rate throttle to prevent burst requests.
    Short window, low limit for preventing rapid-fire requests.
    """
    scope = 'burst'
    rate = '60/minute'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }
