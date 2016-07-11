from safe_routes_app.models import CrimeDescriptor

__author__ = 'Edgar'

import requests
import grequests
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
    urls = []
    for item in coordsArr:
        response = requests.get(main_url + "crimes-street/all-crime?poly=" + item + "&date=" + date)
        if(response.ok):
            # convert the content to json and extract the date
            jdata = json.loads(response.content)
            if len(jdata) > 0:
                crime_incidences += jdata

    crime_data = {"crimes" : crime_incidences}
    return crime_data


def get_crimes_details(date, location_id):
    crimes = {}
    #Get the crimes per each subarea
    crime_incidences = []
    crime_descriptions = get_crime_descriptions()
    response = requests.get(main_url + "crimes-at-location?date=" + date + "&location_id="+ location_id)
    if(response.ok):
        # convert the content to json and extract the date
        crime_incidences = json.loads(response.content)
    #Extract the data
    grouped_data = {}
    for crime in crime_incidences:
        if crime["outcome_status"] != None:
            data = {"date_update": crime["outcome_status"]["date"], "outcome": crime["outcome_status"]["category"] }
        else:
            data = {"date_update": "Not available", "outcome": "Not available" }

        category = crime["category"]
        if grouped_data != None and category in grouped_data:
            grouped_data[category]["number_crimes"] = grouped_data[category]["number_crimes"] + 1
            grouped_data[category]["crimes"].append(data)
        else:
            item = {"number_crimes" : 1, "name_crime" : crime_descriptions[category]["crime_name"],
                    "crime_description" : crime_descriptions[category]["crime_description"],
                    "crimes": [data]}
            grouped_data[category] = item
    return {"crimes_detail": grouped_data}

def get_crime_descriptions():
    crime_descriptions = {}
    for item in CrimeDescriptor.objects.raw('SELECT * FROM crime_descriptor'):
        crime_descriptions[item.crime_key] = {"crime_name" : item.crime_name, "crime_description" : item.crime_description}
    return crime_descriptions