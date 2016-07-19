from django.test import TestCase
from safe_routes_app import crime_service

#Check that the views are responding correctly
class ViewsTests(TestCase):
    def test_index(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_about(self):
        response = self.client.get("/about/")
        self.assertEqual(response.status_code, 200)

    def test_crime_seriousness(self):
        response = self.client.get("/routes/crime_seriousness/")
        self.assertEqual(response.status_code, 200)

    def test_crimes_type_info(self):
        response = self.client.get("/routes/crime_types_info/")
        self.assertEqual(response.status_code, 200)

    def test_crimes_detail(self):
        response = self.client.get("/routes/crimes_detail/2016-05/776922/")
        self.assertEqual(response.status_code, 200)

#Unit tests for the Crime Service
class CrimeServiceTests(TestCase):
    def test_months_reported(self):
        data = crime_service.get_months_reported()
        self.assertEqual(len(data["months"]), 12)

    def test_crime_details(self):
        data = crime_service.get_crimes_details("2016-05","776922")
        self.assertGreater(len(data["crimes_detail"]), 0)
        self.assertGreater(data["total_crimes"], 0)
        self.assertIsNot(data["street"], "")

    def test_crime_descriptions(self):
        data = crime_service.get_crime_descriptions()
        self.assertIsNot(data, None)

    def test_crime_seriousness(self):
        data = crime_service.get_crime_seriousness()
        self.assertIsNot(data, None)

    def test_get_serious_crimes(self):
        data = crime_service.get_crime_seriousness_filter(1)
        self.assertGreater(len(data), 0)

    def test_get_less_serious_crimes(self):
        data = crime_service.get_crime_seriousness_filter(0)
        self.assertGreater(len(data), 0)

