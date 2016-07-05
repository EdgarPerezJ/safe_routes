/**
* Created by Edgar on 6/14/2016.
*
* JS script that contains the functions to search for a route and the crime incidences in the sorrounding area.
*
*/

/**
 * Global variables required during the use of the application.
 */
var map = null;
var LAT = null;
var LNG = null;
var autocompleteOrigin = null;
var autocompleteDestination = null;
var autocompleteListener = [];
var boxpolys = [];
var directions = [];
var routes = [];
var placeMarkers = [];
var routeBoxer = null;
var distance = 0.01 * 1.609344; // km
var crimesObj = [];
var crimeMarkers = [];
var crimeInfoWindows = [];

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
                }
            });
            //Initializes the library RouteBoxer
            routeBoxer = new RouteBoxer();
            initSearch(map);
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
        searchRoute();
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
        types: []
    };
    //Autocomplete search Origin
    var inputOrigin = $( "#txtOrigin" )[ 0 ];
    autocompleteOrigin = new google.maps.places.Autocomplete(inputOrigin, options);
    autocompleteOrigin.bindTo('bounds', map);
    addListenerSearch(autocompleteOrigin, map, true);
    //Autocomplete search Destination
    var inputDestination = $( "#txtDestination" )[ 0 ];
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
        var place = autocompleteInput.getPlace();
        if (!place.geometry) {
            window.alert("Autocomplete's returned place contains no geometry");
            return;
        }
        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(15);
        }
        var label = isOrigin == true ? "S" : "T";
        var marker = new google.maps.Marker({
            position: place.geometry.location,
            label: label,
            map: map
        });
        marker.setVisible(true);
        placeMarkers.push(marker);
    });
    autocompleteListener.push(listener);
}

/**
 * Search for the best routes (up to three) by Using Google Directions.
 */
function searchRoute(){
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
                var boxes = routeBoxer.box(path, distance);
                var boxesCoords = getBoxesCoords(boxes);
                boxesCoordsJson[i] = boxesCoords;
            }
            getCrimes(boxesCoordsJson);
        } else {
            alert("Directions query failed: " + status);
        }
    });
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
    clearMarkers();
    clearBoxes();
    clearAutocomplete();
    initSearch(map);
}

/**
 * Clear the boxes displayed in the map
 */
function clearBoxes() {
    if (boxpolys != null) {
         for (var i = 0; i < boxpolys.length; i++) {
             boxpolys[i].setMap(null);
         }
    }
    boxpolys = [];
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
}

/**
 * Clear the markers displayed in the map
 */
function clearMarkers() {
    if (placeMarkers !== null) {
         for (var i = 0; i < placeMarkers.length; i++) {
             //placeMarkers[i].setVisible(false);
             placeMarkers[i].setMap(null);
         }
    }
    placeMarkers = [];
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
function getCrimes(boxesCoords){
    var date = $("#cmbMonth").val();
    var requests = [];
    for(var i = 0; i < boxesCoords.length; i++) {
        var coords = boxesCoords[i];
        requests.push(prepareRequest(date, coords, i));
    }
    //Check the length of the array with the crimes to verify if all the data has been retrieved.
    $.when(requests[0](), requests[1](), requests[2]()).then(showData);
}

/**
 * Function that displays the data of the crime statistics obtained
 * @param data1 crime statistics of the first route
 * @param data2 crime statistics of the second route
 * @param data3 crime statistics of the third route
 */
function showData(data1, data2, data3) {
    //Draw markers
    crimesObj = [data1, data2, data3];
    for(var i = 0; i < crimesObj.length; i++) {
        //Validates that exist data
        if(crimesObj[i] === null || crimesObj[i] === undefined){
            continue;
        }
        var data = crimesObj[i][0].crimes;
        var infoWindows = [];
        var crimes = [];
        for (var j = 0; j < data.length; j++) {
            var contentString = '<div id="content">'+
                  '<div id="siteNotice">'+
                  '</div>'+
                  '<h5 id="firstHeading" class="firstHeading">'+data[j].location.street.name+'</h5>'+
                  '<div id="bodyContent">'+
                  '<p>'+data[j].category+'</p>' +
                  '</div>'+
                  '</div>';
            var infowindow = new google.maps.InfoWindow({
                content: contentString
              });
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(Number(data[j].location.latitude), Number(data[j].location.longitude)),
                label: "",
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
        }
        crimeInfoWindows[i] = infoWindows;
        infoWindows = [];
        crimeMarkers[i] = crimes;
        crimes = [];
    }
    //Show the results in the left sidebar
    drawResults()
}

/**
 * Function that displays the results in the lest sidebar of the screen
 */
function drawResults(){
    for(var i=0; i < crimesObj.length; i++){
        //Validates that the route exist
        if(routes[i] === null || routes[i] === undefined ||
            crimesObj[i] === null || crimesObj[i] === undefined){
            continue;
        }
        var point = routes[i].legs[0];
        var content = "<li>" +
                        "<div class='overview'>" +
                            "<p class='main-detail'>" + crimesObj[i][0].crimes.length + " " +(crimesObj[i][0].crimes.length === 1 ? "crime" : "crimes")+ "</p>" +
                            "<p class='sub-detail'>" + point.duration.text + " | " + point.distance.text + "</p>" +
                            "<span class='label label-success'>Best</span> " +
                            "<span class='label label-info'>Safest</span>" +
                            " <span class='label label-warning'>Shortest</span>" +
                        "</div> " +
                        "<div class='info'> " +
                            "<p>Option " + (i + 1) + "</p> " +
                            "<a class='btn btn-default btn-sm pull-right' href='#' onClick='changeRoute("+i+");'>Details</a> " +
                        "</div> " +
                        "<div class='clearfix'></div> " +
                    "</li> ";
        $("#resultsSummary").append(content);
    }
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