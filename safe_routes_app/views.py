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
    logger.info("The date is: " + date)
    logger.info("Boxes coords are: " + str(boxesCoords))
    crimes = crime_service.get_crimes(date, boxesCoords)
    return JsonResponse(crimes)