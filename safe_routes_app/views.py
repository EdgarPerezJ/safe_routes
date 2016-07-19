__author__ = 'Edgar'

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
import crime_service
import logging

# Get an instance of a logger
logger = logging.getLogger("GigM8")

def index(request):
    """gets the crime reported and renders the index.html page

    Keyword arguments:
    request -- Http request object
    """
    data = crime_service.get_months_reported()
    return render(request, 'index.html', data)

def about(request):
    """ Renders the about.html page

    Keyword arguments:
    request -- Http request object
    """
    return render(request, 'about.html')

def get_crime_types_info(request):
    """ Gets the crime types

    Keyword arguments:
    request -- Http request object
    """
    crime_desc = crime_service.get_crime_descriptions()
    crime_seriousness = crime_service.get_crime_seriousness()
    return JsonResponse({"descriptions": crime_desc, "seriousness": crime_seriousness})

def get_crimes_detail(request, date, location_id):
    """ Gets the details of the crimes located at a particular area

    Keyword arguments:
    request -- Http request object
    date -- Date of the crimes reportes in format YYYY-DD
    location_id -- Id of the location of the crime
    """
    crimes_detail = crime_service.get_crimes_details(date, location_id)
    return render(request, 'crimes_detail.html', crimes_detail)

def get_crime_seriousness(request):
    """ Gets the crime seriousness of the crimes

    Keyword arguments:
    request -- Http request object
    """
    serious_crimes = crime_service.get_crime_seriousness_filter(1)
    non_serious_crimes = crime_service.get_crime_seriousness_filter(0)
    data = {"serious_crimes": serious_crimes, "non_serious_crimes": non_serious_crimes}
    return render(request, 'crimes_seriousness.html', data)
