__author__ = 'Edgar'

import requests
import json
import logging
from datetime import datetime, timedelta

#Defines the URL from the API
main_url = "https://data.police.uk/api/"

# Get an instance of a logger
logger = logging.getLogger("GigM8")

def get_months_reported(request):
    response = requests.get(main_url + "crime-last-updated")
    months = []
    if(response.ok):
        # convert the content to json and extract the date
        jdata = json.loads(response.content)
        date_updated = datetime.strptime(jdata["date"], '%Y-%m-%d')
        #Get the months from 1 year before
        date_aux = date_updated
        months.append({
            "month": date_aux.strftime('%Y-%m'),
            "str_month": "Reported in " + date_aux.strftime('%B %Y')
        })
        for i in range(0, 11):
            d_subtracted = datetime(date_aux.year, date_aux.month, 1) - timedelta(days=1)
            months.append({
                "month": d_subtracted.strftime('%Y-%m'),
                "str_month": "Reported in " + d_subtracted.strftime('%B %Y')
            })
            date_aux = d_subtracted
    else:
        logger.info("Information not found")
    data = {
        "months" : months
    }
    return data

def get_crimes(date, boxesCoords):
    crimes = {}
    #Get the crimes per each subarea
    crime_incidences = []
    coordsArr = boxesCoords.split(";")
    for item in coordsArr:
        #logger.info("Coords: " + item);
        response = requests.get(main_url + "crimes-street/all-crime?poly=" + item + "&date=" + date)
        if(response.ok):
            # convert the content to json and extract the date
            jdata = json.loads(response.content)
            if len(jdata) > 0:
                crime_incidences += jdata

    crime_data = {"crimes" : crime_incidences}
    return crime_data