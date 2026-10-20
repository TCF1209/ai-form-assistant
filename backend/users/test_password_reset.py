"""
Tests for the password reset flow (one-time links built with Django's token generator).
"""
import re

from django.core import mail
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from core.factories import PASSWORD, make_user

NEW_PASSWORD = 'A-brand-new-pass-42'


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = make_user('jane')

    def request_link(self, email='jane@example.com'):
        return self.client.post('/api/v1/auth/password-reset/', {'email': email}, format='json')

    def confirm(self, uid, token, password=NEW_PASSWORD):
        return self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid, 'token': token, 'new_password': password, 'new_password_confirm': password,
        }, format='json')

    def link_params(self):
        self.request_link()
        match = re.search(r'reset-password\?uid=([\w-]+)&token=([\w-]+)', mail.outbox[-1].body)
        return match.group(1), match.group(2)

    def test_the_emailed_link_resets_the_password(self):
        uid, token = self.link_params()
        self.assertEqual(self.confirm(uid, token).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_a_link_works_only_once(self):
        uid, token = self.link_params()
        self.confirm(uid, token)
        self.assertEqual(self.confirm(uid, token, 'Another-new-pass-77').status_code, 400)

    def test_an_access_token_is_not_a_reset_token(self):
        # Regression: the reset link used to carry a JWT access token, and any access token
        # (e.g. one taken from the browser) could be used to change the password.
        uid, _ = self.link_params()
        access = str(RefreshToken.for_user(self.user).access_token)
        self.assertEqual(self.confirm(uid, access).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_unknown_emails_get_the_same_answer_and_no_email(self):
        response = self.request_link('nobody@example.com')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_resetting_signs_out_existing_sessions(self):
        refresh = str(RefreshToken.for_user(self.user))
        uid, token = self.link_params()
        self.confirm(uid, token)
        response = self.client.post('/api/v1/auth/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, 401)
