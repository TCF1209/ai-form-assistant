"""
Audit logging utility functions.
"""
from django.db.models import Model
from .models import AuditLog


def make_json_serializable(obj):
    """Convert an object to a JSON-serializable format."""
    if obj is None:
        return None
    if isinstance(obj, Model):
        # For Django models, return their ID and string representation
        return {'id': str(obj.pk), 'repr': str(obj)}
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [make_json_serializable(item) for item in obj]
    if isinstance(obj, (str, int, float, bool)):
        return obj
    # For other types, try to convert to string
    try:
        return str(obj)
    except Exception:
        return repr(obj)


def log_action(user, action, model_name, object_id, object_repr='', changes=None, request=None):
    """
    Create an audit log entry.

    Args:
        user: The user performing the action
        action: The action type (from AuditLog.ActionType)
        model_name: Name of the model being acted upon
        object_id: ID of the object
        object_repr: String representation of the object
        changes: Dictionary of changes made (optional)
        request: HTTP request object (optional, for IP/user-agent)

    Returns:
        AuditLog instance
    """
    ip_address = None
    user_agent = ''

    if request:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

    # Make changes JSON-serializable
    safe_changes = make_json_serializable(changes) if changes else {}

    return AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=str(object_id),
        object_repr=object_repr,
        changes=safe_changes,
        ip_address=ip_address,
        user_agent=user_agent
    )


def get_client_ip(request):
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# Shortcut functions for common actions
def log_create(user, model_name, obj, request=None):
    """Log a CREATE action."""
    return log_action(
        user=user,
        action=AuditLog.ActionType.CREATE,
        model_name=model_name,
        object_id=obj.id,
        object_repr=str(obj),
        request=request
    )


def log_update(user, model_name, obj, changes=None, request=None):
    """Log an UPDATE action."""
    return log_action(
        user=user,
        action=AuditLog.ActionType.UPDATE,
        model_name=model_name,
        object_id=obj.id,
        object_repr=str(obj),
        changes=changes,
        request=request
    )


def log_delete(user, model_name, object_id, object_repr='', request=None):
    """Log a DELETE action."""
    return log_action(
        user=user,
        action=AuditLog.ActionType.DELETE,
        model_name=model_name,
        object_id=object_id,
        object_repr=object_repr,
        request=request
    )


def log_submit(user, model_name, obj, request=None):
    """Log a SUBMIT action."""
    return log_action(
        user=user,
        action=AuditLog.ActionType.SUBMIT,
        model_name=model_name,
        object_id=obj.id,
        object_repr=str(obj),
        request=request
    )


def log_approve(user, model_name, obj, comments='', request=None):
    """Log an APPROVE action."""
    return log_action(
        user=user,
        action=AuditLog.ActionType.APPROVE,
        model_name=model_name,
        object_id=obj.id,
        object_repr=str(obj),
        changes={'comments': comments} if comments else {},
        request=request
    )


def log_reject(user, model_name, obj, comments='', request=None):
    """Log a REJECT action."""
    return log_action(
        user=user,
        action=AuditLog.ActionType.REJECT,
        model_name=model_name,
        object_id=obj.id,
        object_repr=str(obj),
        changes={'comments': comments} if comments else {},
        request=request
    )


def log_export(user, model_name, details='', request=None):
    """Log an EXPORT action."""
    return log_action(
        user=user,
        action=AuditLog.ActionType.EXPORT,
        model_name=model_name,
        object_id='',
        object_repr=details,
        request=request
    )
