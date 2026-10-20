from django.test import SimpleTestCase


class HealthCheckTests(SimpleTestCase):
    def test_health_is_public_and_needs_no_database(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})
