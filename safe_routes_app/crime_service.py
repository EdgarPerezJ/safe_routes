from safe_routes_app.models import CrimeDescriptor, CrimeSeriousness

__author__ = 'Edgar'

import requests
import json
import logging
from datetime import datetime, timedelta

#Defines the URL from the API
main_url = "https://data.police.uk/api/"

# Get an instance of a logger
logger = logging.getLogger("GigM8")

def get_months_reported():
    """Get the moths reported considering the last update

    Keyword arguments:
    request -- Http request object
    """
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
        for i in range(0, 12):
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

def get_crimes_details(date, location_id):
    """Get the details of the crimes located in a particular area

    Keyword arguments:
    date -- Date of the crimes reportes in format YYYY-DD
    location_id -- Id of the crime area
    """
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
    street = None
    total_crimes = len(crime_incidences)
    for crime in crime_incidences:
        street = crime["location"]["street"]["name"]
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
    date_aux = datetime.strptime(date, '%Y-%m')
    return {"street": street, "total_crimes": total_crimes, "date": date_aux.strftime('%B %Y'), "crimes_detail": grouped_data}

def get_crime_descriptions():
    """Get the name and description of the list of crime categories.

    Keyword arguments:
    """
    crime_descriptions = {}
    for item in CrimeDescriptor.objects.raw('SELECT * FROM crime_descriptor'):
        crime_descriptions[item.crime_key] = {"crime_name" : item.crime_name, "crime_description" : item.crime_description}
    return crime_descriptions

def get_crime_seriousness():
    """Get the list of crime categories with their crime seriousness

    Keyword arguments:
    """
    crime_seriousness = {}
    for item in CrimeSeriousness.objects.raw('SELECT * FROM crime_seriousness order by seriousness_rate asc'):
        crime_seriousness[item.crime_key] = {"crime_seriousness" : int(item.seriousness_rate) }
    return crime_seriousness

def get_crime_seriousness_filter(seriousness):
    """Get the list of crime categories filtered by seriousness

    Keyword arguments:
    seriousness -- 1 for serious crimes, 0 for less-serious crimes.
    """
    crime_seriousness = []
    condition = ""
    if seriousness == 1:
        condition = ">=2 "
    else:
        condition = "<2 "
    for item in CrimeSeriousness.objects.raw('SELECT a.*, a.seriousness_rate as crime_seriousness, b.crime_name, b.crime_description '
                                             'FROM crime_seriousness a inner join ' +
                                             'crime_descriptor b on a.id = b.id ' +
                                             'where  a.seriousness_rate ' + condition +
                                             'order by seriousness_rate desc'):
        crime_seriousness.append(item)
    return crime_seriousness