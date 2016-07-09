from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
import crime_service
import logging
import json

# Get an instance of a logger
logger = logging.getLogger("GigM8")

def index(request):
    data = crime_service.get_months_reported(request)
    return render(request, 'index.html', data)

def get_crimes(request):
    date = request.POST["dateCrime"]
    boxesCoords = json.loads(request.POST["boxesCoords"])
    crimes = crime_service.get_crimes(date, boxesCoords)
    return JsonResponse(crimes)

def get_crimes_detail(request, date, location_id):
    crimes_detail = crime_service.get_crimes_details(date, location_id)
    return render(request, 'crimes_detail.html', crimes_detail)