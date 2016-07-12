/**
* Created by Edgar on 6/14/2016.
* JS script that contains the functions to search for a route and the crime incidences in the sorrounding area.
*
*/
 
/**
 * Stores the map object used in the application
 * @type {object}
 */
var map = null;
/**
 * Stores the Latitude of the current location of the user
 * @type {Object}
 */
var LAT = null;
/**
 * Stores the Longitude of the current location of the user
 * @type {Object}
 */
var LNG = null;
/**
 * Stores the Autocomplete object for the Origin
 * @type {Object}
 */
var autocompleteOrigin = null;
/**
 * Stores the Autocomplete object for the Destination
 * @type {Object}
 */
var autocompleteDestination = null;
/**
 * Stores the listeners generated for the autocomplete objects used in the search form
 * @type {Array}
 */
var autocompleteListener = [];
/**
 * Array of the directions objects found by google maps
 * @type {Array}
 */
var directions = [];
/**
 * Array of the routes found by Google Maps
 * @type {Array}
 */
var routes = [];
/**
 * Array that contains the markers defined for the origin and destination
 * @type {Array}
 */
var placeMarkers = new Array(2);
/**
 * Instance of the RouteBoxer class.
 * @type {object}
 */
var routeBoxer = null;
/**
 * Constant that contains the distance used for defining the search area around a given route
 * @type {number}
 */
var distance = 0.01 * 1.609344; // km
/**
 * Stores the crime objects found for each route recommended by the application
 * @type {Array}
 */
var crimesObj = [];
/**
 * Stores thelist of map markers generates in the search
 * @type {Array}
 */
var crimeMarkers = [];
/**
 * Contains the list of infowindows generated in the search of a route
 * @type {Array}
 */
var crimeInfoWindows = [];
/**
 * Constant that indicates the safety level to calculatethe best route
 * @type {number}
 */
var safetyLevel = 0.6;
/**
 * Contains the names and descriptions of the crime types.
 * @type {object}
 */
var crimeDescriptions = null;
 
/**
 * Initializes the map and the bindings of the inputs and buttons
 */
function initMap(){
    //get the current location by IP address
    $.ajax({
        url: 'https://ipapi.co/json/',
        type: 'GET',
        dataType: 'json',
        data: {
          format: 'json'
        },
        error: function() {
           alert("An error has happened while getting the location");
           return;
        },
        success: function(data) {
            //Sets the latitude and longitude based on the current location of the client.
            LAT = data.latitude;
            LNG = data.longitude;
            //Creates the map
            var mapDiv = document.getElementById('map');
            map = new google.maps.Map(mapDiv, {
                center: {lat: LAT, lng: LNG},
                zoom: 13,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                },
                styles: [   {       "featureType":"landscape",      "stylers":[         {               "hue":"#FFBB00"         },          {               "saturation":43.400000000000006         },          {               "lightness":37.599999999999994          },          {               "gamma":1           }       ]   },  {       "featureType":"road.highway",       "stylers":[         {               "hue":"#FFC200"         },          {               "saturation":-61.8          },          {               "lightness":45.599999999999994          },          {               "gamma":1           }       ]   },  {       "featureType":"road.arterial",      "stylers":[         {               "hue":"#FF0300"         },          {               "saturation":-100           },          {               "lightness":51.19999999999999           },          {               "gamma":1           }       ]   },  {       "featureType":"road.local",     "stylers":[         {               "hue":"#FF0300"         },          {               "saturation":-100           },          {               "lightness":52          },          {               "gamma":1           }       ]   },  {       "featureType":"water",      "stylers":[         {               "hue":"#0078FF"         },          {               "saturation":-13.200000000000003            },          {               "lightness":2.4000000000000057          },          {               "gamma":1           }       ]   },  {       "featureType":"poi",        "stylers":[         {               "hue":"#00FF6A"         },          {               "saturation":-1.0989010989011234            },          {               "lightness":11.200000000000017          },          {               "gamma":1           }       ]   }]
            });
            initSearch(map);
            getCrimeDescriptions();
        }
    });
}
 
/**
 * Gets the crime descriptions of each crime type
 */
function getCrimeDescriptions(){
    $.ajax({
        url: '/routes/crime_descriptions',
        type: 'GET',
        dataType: 'json',
        data: {
            format: 'json'
        },
        error: function () {
            alert("An error has happened while getting the location");
        },
        success: function (data) {
            crimeDescriptions = data;
        }
    });
}
 
/**
 * Initializes the UI
 */
$(function(){
    $('.sidebar-left .slide-submenu').on('click',function() {
        var thisEl = $(this);
        thisEl.closest('.sidebar-body').fadeOut('slide',function(){
            $('.mini-submenu-left').fadeIn();
            applyMargins();
        });
    });
    $('.mini-submenu-left').on('click',function() {
        var thisEl = $(this);
        $('.sidebar-left .sidebar-body').toggle('slide');
        thisEl.hide();
        applyMargins();
    });
    $(window).on("resize", applyMargins);
    var map = new ol.Map({
        target: "map",
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: [0, 0],
            zoom: 15
        })
    });
    //Binds the click event for the search button
    $("#btnSearchRoute").click(function() {
        if(validateForm()){
            clearDirections();
            clearMarkers(false);
            searchRoute();
        }
    });
    //Binds the click event for clear button
    $("#btnClear").click(function(){
        clearMapContent();
    });
    applyInitialUIState();
    applyMargins();
});
 
/**
 * Function that initializes the search form
 * @param map the map on which the form will be bound
 */
function initSearch(map){
    //Binds the events for the autocomplete objects
    var defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(LAT, LNG)
    );
    var options = {
        bounds: defaultBounds,
        types: [],
        componentRestrictions: {country: 'uk'}
    };
    //Autocomplete search Origin
    var inputOrigin = $( "#txtOrigin" )[0];
    autocompleteOrigin = new google.maps.places.Autocomplete(inputOrigin, options);
    autocompleteOrigin.bindTo('bounds', map);
    addListenerSearch(autocompleteOrigin, map, true);
    //Autocomplete search Destination
    var inputDestination = $( "#txtDestination" )[0];
    autocompleteDestination = new google.maps.places.Autocomplete(inputDestination, options);
    autocompleteDestination.bindTo('bounds', map);
    addListenerSearch(autocompleteDestination, map, false);
}
 
/**
 * Function that adds a listener to the autocomplete inputs when the value changes
 * @param autocompleteInput the html input field representing the autocomplete
 * @param map the map to which the autocomplete will be bound
 * @param isOrigin boolean telling if the autocomplete is the origin
 */
function addListenerSearch(autocompleteInput, map, isOrigin){
    var listener = autocompleteInput.addListener('place_changed', function() {
        var indexMarker = 0;
        var icon = "";
        //Validates that the place has a geometry
        var place = autocompleteInput.getPlace();
        if (!place.geometry) {
            window.alert("Autocomplete's returned place contains no geometry");
            return;
        }
        //Stores an auxiliar value for validation
        if(isOrigin){
            $("#txtOrigin").val(place.formatted_address);
            icon = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
            indexMarker = 0;
        }
        else{
            $("#txtDestination").val(place.formatted_address);
            icon = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
            indexMarker = 1;
        }
        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(15);
        }
        //Id there was a previous marker, it is removed.
        if(placeMarkers[indexMarker] !== null && placeMarkers[indexMarker] !== undefined){
            placeMarkers[indexMarker].setMap(null);
            placeMarkers[indexMarker] = null;
        }
        var marker = new google.maps.Marker({
            position: place.geometry.location,
            label: "",
            icon: icon,
            map: map
        });
        marker.setVisible(true);
        placeMarkers[indexMarker] = marker;
    });
    autocompleteListener.push(listener);
}
 
/**
 * Function that validates the content in the form to execute the search
 * @returns {boolean} true, if the data provided is correct.
 */
function validateForm(){
    //Validates selected origin and destination
    var message = "";
    var addressOrigin = autocompleteOrigin.getPlace() === undefined ? "" : autocompleteOrigin.getPlace().formatted_address;
    if($("#txtOrigin").val() === "" || addressOrigin !== $("#txtOrigin").val()){
        message +="Select a place for the Origin. <br/>";
    }
    var addressDestination = autocompleteDestination.getPlace() === undefined ? "" : autocompleteDestination.getPlace().formatted_address;
    if($("#txtDestination").val() === "" || addressDestination !== $("#txtDestination").val()){
        message +="Select a place for the Destination. <br/>";
    }
    //Validates that the destination is different than the origin
    if($("#txtOrigin").val() !== "" && $("#txtOrigin").val() === $("#txtDestination").val()){
        message +="The Destination must be different than the Origin. <br/>";
    }
    if(message !== ""){
        $("#validationMessage").html(message);
        $("#alertValidation").show();
        return false;
    }
    $("#alertValidation").hide();
    return true;
}
 
/**
 * Search for the best routes (up to three) by Using Google Directions.
 */
function searchRoute(){
    //Show the spinner
    showSpinner();
    var directionService = new google.maps.DirectionsService();
    //prepare the request
    var request = {
        origin: autocompleteOrigin.getPlace().geometry.location,
        destination: autocompleteDestination.getPlace().geometry.location,
        provideRouteAlternatives: true,
        travelMode: google.maps.DirectionsTravelMode.WALKING
    }
    // Make the directions request
    directionService.route(request, function(result, status) {
        var boxesCoordsJson = new Array(3);
        if (status == google.maps.DirectionsStatus.OK) {
            if(!validateRoutes(result.routes)){
                $("#validationMessage").html("We're sorry. At the moment, we can only process routes up to <strong>5km</strong> of distance.");
                $("#alertValidation").show();
                hideSpinner();
                return false;
            }
            for (var i = 0, len = result.routes.length; i < len; i++) {
                var direction = new google.maps.DirectionsRenderer({
                    map: map,
                    directions: result,
                    routeIndex: i,
                    suppressMarkers: true
                });
                directions.push(direction);
                routes.push(result.routes[i]);
                // Box around the overview path of the first route
                var path = result.routes[i].overview_path;
                //Initializes the library RouteBoxer
                routeBoxer = new RouteBoxer();
                var boxes = routeBoxer.box(path, distance);
                var boxesCoords = getBoxesCoords(boxes);
                boxesCoordsJson[i] = boxesCoords;
            }
            prepareRequestCrimes(boxesCoordsJson);
        } else {
            alert("Directions query failed: " + status);
        }
    });
}
 
/**
 * Function that validates that the distance of the route is up to 5 km
 * @param routes array of routes found by Google Maps API
 * @returns {boolean} false, if any of the routes is more than 5km of distance
 */
function validateRoutes(routes){
    for(var i = 0; i < routes.length; i++){
        if (routes[i].legs[0].distance.value > 5000){
            return false;
        }
    }
    return true;
}
 
/**
 * Gets the coordinates of the boxes to execute the search of the crime incidences from the data.police.uk API
 * @param boxes array of the boxes found for a given route
 * @returns {string} the list of coordinates of the rectangle shapes separated by semi-colon (;)
 */
function getBoxesCoords(boxes){
    var strBoxesCoords = "";
    for (var i = 0; i < boxes.length; i++) {
        // North West
        var NE = boxes[i].getNorthEast();
        var SW = boxes[i].getSouthWest();
        // North West
        var NW = new google.maps.LatLng(NE.lat(),SW.lng());
        // South East
        var SE = new google.maps.LatLng(SW.lat(),NE.lng());
        strBoxesCoords += NE.lat() + "," + NE.lng() +
            ":" + NW.lat() + "," + NW.lng() +
            ":" + SW.lat() + "," + SW.lng() +
            ":" + SE.lat() + "," + SE.lng();
        if(i !== (boxes.length-1)){
            strBoxesCoords += ";";
        }
    }
    return strBoxesCoords;
}
 
/**
 * Function that clears the content of a map
 */
function clearMapContent(){
    clearDirections();
    clearMarkers(true);
    clearAutocomplete();
    initSearch(map);
    map.setCenter({lat: LAT, lng: LNG});
    map.setZoom(13);
}
 
/**
 * Clear the directions displayed in the map
 */
function clearDirections() {
    if (directions !== null) {
         for (var i = 0; i < directions.length; i++) {
             directions[i].setMap(null);
         }
    }
    directions = [];
    routes = [];
    crimesObj = [];
}
 
/**
 * Clear the markers displayed in the map
 * @param clearPlaceMarkers if true, clear the place markers as well
 */
function clearMarkers(clearPlaceMarkers) {
    if(clearPlaceMarkers) {
        if (placeMarkers !== null) {
            for (var i = 0; i < placeMarkers.length; i++) {
                if(placeMarkers[i] !== null && placeMarkers[i] !== undefined) {
                    placeMarkers[i].setMap(null);
                    placeMarkers[i] = null;
                }
            }
        }
    }
    if(crimeMarkers !== null){
        for(var i = 0; i < crimeMarkers.length; i++){
            for(var j = 0; j < crimeMarkers[i].length; j++){
                crimeMarkers[i][j].setMap(null);
            }
        }
    }
    crimeMarkers = [];
    $("#resultsSummary").empty();
}
 
/**
 * Clear the listeners of the autocomplete inputs
 */
function clearAutocomplete() {
    $("#txtDestination").val("");
    $("#txtOrigin").val("");
    $("#alertValidation").hide();
    if (autocompleteListener !== null) {
         for (var i = 0; i < autocompleteListener.length; i++) {
             google.maps.event.removeListener(autocompleteListener[i]);
         }
    }
}
 
/**
 * Performs the request to get the crimes from the data.police.uk API
 * @param boxesCoords string of the coordinates of every rectangle shape separated by semi-colon (;)
 */
function prepareRequestCrimes(boxesCoords){
    var date = $("#cmbMonth").val();
    console.log("Total routes: " + routes.length);
    for(var i = 0; i < boxesCoords.length; i++) {
        if(boxesCoords[i] === undefined || boxesCoords[i] === null){
            continue;
        }
        var coordsArr = boxesCoords[i].split(";");
        var requests = [];
        for (var j=0; j < coordsArr.length; j++){
            var item = coordsArr[j];
            var url = "https://data.police.uk/api/" + "crimes-street/all-crime?poly=" + item + "&date=" + date
            requests.push($.ajax(url));
        }
        getCrimes(requests, routes.length, i);
    }
}
 
function getCrimes(requests, totalRoutes, indexRoute){
    $.when.apply($, requests).done(function () {
            var crimes = [];
            $.each(arguments, function (i, data) {
                if(data !== null && data[0].length >0){
                    $.merge(crimes, data[0]);
                    console.log(arguments);
                }
            });
            crimesObj[indexRoute] = crimes;
            console.log("Finaliza request: " + indexRoute + " "+ crimes.length);
            if(crimesObj.length === totalRoutes){
                showData();
            }
        });
}
 
/**
 * Function that displays the data of the crime statistics obtained
 */
function showData() {
    var month = $("#cmbMonth").val();
    for(var i = 0; i < crimesObj.length; i++) {
        //Validates that exist data
        if(crimesObj[i] === null || crimesObj[i] === undefined){
            continue;
        }
        var infoWindows = [];
        var crimes = [];
        var j = 0;
        var data = crimesObj[i];
        //Grouped info to draw the info boxes properly.
        var groupDataByLocation = _.groupBy(data, function (obj) {
            return obj.location.latitude+","+obj.location.longitude;
        });
        for (var key in groupDataByLocation) {
            var subgroup = groupDataByLocation[key];
            var contentString = '<div id="content">' +
                  '<h5 id="firstHeading" class="firstHeading">'+subgroup[0].location.street.name+'</h5>' +
                  '<div id="bodyContent">';
            //Groups by category
            var groupDataByCategory = _.groupBy(subgroup, function (obj) {
                return obj.category;
            });
            contentString += "<table class='table table-striped'> "+
                                "<tbody>";
            for (var keyCategory in groupDataByCategory) {
                contentString += "<tr> " +
                                    "<td>" + crimeDescriptions[keyCategory].crime_name + "</th> " +
                                    "<td style='text-align: right'>" + groupDataByCategory[keyCategory].length + "</td> " +
                                "</tr>";
            }
            contentString += "</tbody> "+
                            "</table> "+
                        "<a href='/routes/crimes_detail/"+month+"/"+subgroup[0].location.street.id+"' target='blank'>See details...</a>"+
                    "</div>";
            var infowindow = new google.maps.InfoWindow({
                content: contentString
              });
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(Number(subgroup[0].location.latitude), Number(subgroup[0].location.longitude)),
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#F5A9A9',
                    fillOpacity: 1,
                    scale: 13,
                    strokeColor: '#FA5858',
                    strokeWeight: 2
                  },
                label: ""+subgroup.length,
                map: map,
                infoWindowIndex : j,
                infoWindowRouteIndex : i
            });
            marker.setVisible(false);
            google.maps.event.addListener(marker, 'click',
                function(event)
                {
                    crimeInfoWindows[this.infoWindowRouteIndex][this.infoWindowIndex].open(map, this);
                }
            );
            crimes.push(marker);
            infoWindows.push(infowindow);
            j++;
        }
        crimeInfoWindows[i] = infoWindows;
        infoWindows = [];
        crimeMarkers[i] = crimes;
        crimes = [];
    }
    //Show the results in the left sidebar
    drawResults();
    hideSpinner();
}
 
/**
 * Function that displays the results in the lest sidebar of the screen
 */
function drawResults(){
    var routeIdentifiers = ["A", "B", "C"];
    var shortestRoute = getShortestRoute();
    var safestRoute = getSafestRoute();
    var indexBestRoute = getBestRoute();
    var content = "<h5>Results</h5> "+
                        "<ul class='item-summary'> ";
    for(var i=0; i < crimesObj.length; i++){
        //Validates that the route exist
        if(routes[i] === null || routes[i] === undefined ||
            crimesObj[i] === null || crimesObj[i] === undefined){
            continue;
        }
        var point = routes[i].legs[0];
 
        content += "<li>" +
                    "<div class='overview'>" +
                        "<p class='main-detail'>" + crimesObj[i].length + " " +(crimesObj[i].length === 1 ? "crime" : "crimes")+ "</p>" +
                        "<p class='sub-detail'>" + point.duration.text + " | " + point.distance.text + "</p>";
        //Validates is it's the shortest route
        if(shortestRoute === point.distance.value){
            content += " <span class='label label-warning'>Shortest</span>";
        }
        //Validates if it's the safest route
        if(safestRoute === crimesObj[i].length){
            content += "<span class='label label-info'>Safest</span>";
        }
        //Validates if it's the best
        if(indexBestRoute === i){
            content += "<span class='label label-success'>Best</span>";
        }
            content +=  "</div> " +
                        "<div class='info'> " +
                            "<p>Route " + routeIdentifiers[i] + "</p> " +
                            "<a class='btn btn-default btn-sm pull-right' href='#' onClick='changeRoute("+i+");'>Details</a> " +
                        "</div> " +
                        "<div class='clearfix'></div> " +
                    "</li> ";
 
    }
    content += "</ul>";
    $("#resultsSummary").html(content);
    changeRoute(0);
}
 
/**
 * Prepare the request to extract the crimes from the data.police.uk API
 * @param date date in format "yyyy-mm" of the crimes
 * @param coords coordinates that delimitate the shape of the area where the crimes need to be extracted
 * @param indexRoute index of the route to which the crimes belong to
 * @returns {Function} function that executes the ajax request
 */
function prepareRequest(date, coords, indexRoute){
    //If route doesn't exist
    if(coords === null || coords === undefined){
        var aux = function func(){};
        return aux;
    }
    var csrftoken = getCookie('csrftoken') != null ? getCookie('csrftoken') : $("#hdnCsrfToken").val();
    var func = function executeRequest() {
        return $.ajax({
            url: '/routes/crimes/',
            type: 'POST',
            dataType: 'json',
            data: {"dateCrime": date, "boxesCoords": JSON.stringify(coords)},
            beforeSend: function (xhr, settings) {
                if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                }
            }
        });
    }
    return func;
}
 
/**
 * Function that highlights a given route and displays their crime incidences
 * @param index index of the route that will be highlighted
 */
function changeRoute(index){
    //Updates the color
    for(var i = 0; i < directions.length; i++){
        var color = index === i ? "#0088FF" : "#737373";
        directions[i].setMap(null);
        directions[i].setOptions({
            polylineOptions: {
               strokeColor: color,
               strokeWeight: 6,
               strokeOpacity: 0.6
            }
        });
        directions[i].setMap(map);
    }
    //Displays the crime-statistics properly.
    for(var i = 0; i < crimeMarkers.length; i++){
        var visibility = index === i ? true : false;
        for(var j = 0; j < crimeMarkers[i].length; j++){
            crimeMarkers[i][j].setVisible(visibility);
        }
    }
}
 
function getShortestRoute(){
    var distances = [];
    for(var i= 0; i < routes.length ; i++){
        distances.push(routes[i].legs[0].distance.value);
    }
    return Math.min(...distances);
}
 
function getSafestRoute(){
    var crimeNumber = [];
    for(var i= 0; i < crimesObj.length ; i++){
        if(crimesObj[i] !== null && crimesObj[i] !== undefined){
            crimeNumber.push(crimesObj[i].length);
        }
    }
    return Math.min(...crimeNumber);
}
 
function getBestRoute(){
    if(routes.length === 1){
        return 0;
    }
    var rates = [];
    var crimeNumber = [];
    for(var i= 0; i < crimesObj.length ; i++){
        if(crimesObj[i] !== null && crimesObj[i] !== undefined){
            crimeNumber.push(crimesObj[i].length);
        }
    }
    var distances = [];
    for(var i= 0; i < routes.length ; i++){
        distances.push(routes[i].legs[0].distance.value);
    }
    //Extract the max and min values
    var maxCrime = Math.max(...crimeNumber);
    var minCrime = Math.min(...crimeNumber);
    var maxDistance = Math.max(...distances);
    var minDistance = Math.min(...distances);
    //Generate the rate per route
    for(var i= 0; i < routes.length ; i++){
        var normalizedDistance = (distances[i] - minDistance)/(maxDistance-minDistance);
        var normalizedCrime = (crimeNumber[i] - minCrime)/(maxCrime-minCrime);
        var rate = ((1-safetyLevel)*normalizedDistance) + (safetyLevel*normalizedCrime);
        rates.push(rate);
    }
    //Gets the index of the route with the smallest rate
    var minRate = Math.min(...rates);
    var indexBetterRoute =  -1;
    for(var i= 0; i < rates.length ; i++){
        if(rates[i] === minRate){
            indexBetterRoute = i;
            break;
        }
    }
    return indexBetterRoute;
}
 
/**
 * Function that extract a given cookie from the browser
 * @param name name of the cookie
 * @returns value of the cookie
 */
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
 
/**
 * Function that identifies if the method used for a request is safe
 * @param method name of the HTTP method used
 * @returns {boolean} true is it is a safe method
 */
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
 
/**
 * Function that applies the margins of the maps according to the device on which
 * the application is visualized.
 */
function applyMargins() {
    var leftToggler = $(".mini-submenu-left");
    if (leftToggler.is(":visible")) {
      $("#map .ol-zoom")
        .css("margin-left", 0)
        .removeClass("zoom-top-opened-sidebar")
        .addClass("zoom-top-collapsed");
    } else {
      $("#map .ol-zoom")
        .css("margin-left", $(".sidebar-left").width())
        .removeClass("zoom-top-opened-sidebar")
        .removeClass("zoom-top-collapsed");
    }
}
 
/**
 * Function that detects if the screen is constrained
 * @returns {boolean}
 */
function isConstrained() {
    return $(".sidebar").width() == $(window).width();
}
 
/**
 * Function that applies the initial UI state of the application according to the screen
 * of the device.
 */
function applyInitialUIState() {
    if (isConstrained()) {
      $(".sidebar-left .sidebar-body").fadeOut('slide');
      $('.mini-submenu-left').fadeIn();
    }
}
 
/**
 * Function that shows a spinner to block the screen
 */
function showSpinner(){
    $('body').pleaseWait({
        // crazy mode
        crazy: false,
        // animation speed
        speed: 5,
        // rotation speed
        increment: 2,
    });
}
 
/**
 * Function that hides the spinner that is displayed
 */
function hideSpinner(){
    $('body').pleaseWait("stop");
}