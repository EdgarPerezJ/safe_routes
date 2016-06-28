/**
 * Created by Edgar on 6/14/2016.
 */
var map = null;
var LAT = null;
var LNG = null;
var autocompleteOrigin = null;
var autocompleteDestination = null;

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

function isConstrained() {
    return $(".sidebar").width() == $(window).width();
}

function applyInitialUIState() {
    if (isConstrained()) {
      $(".sidebar-left .sidebar-body").fadeOut('slide');
      $('.mini-submenu-left').fadeIn();
    }
}

function initMap(){
    //get the current location by IP address
    $.ajax({
       url: 'https://ipapi.co/json/',
       data: {
          format: 'json'
       },
       error: function() {
           alert("An error has happened while getting the location");
       },
       dataType: 'json',
       success: function(data) {
            LAT = data.latitude;
            LNG = data.longitude;

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

            bindSearch(map);
       },
       type: 'GET'
    });
}

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

    //Binds the click even for the search button
    $("#btnSearchRoute").click(function() {
        searchRoute();
    });

    applyInitialUIState();
    applyMargins();
});

/**
 * Function that initializes the search form
 * @param map the map on which the form will be bound
 */
function bindSearch(map){
    //Autocomplete search Origin
    var defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(LAT, LNG)
    );

    var options = {
        bounds: defaultBounds,
        types: []
    }

    var inputOrigin = $( "#txtOrigin" )[ 0 ];
    autocompleteOrigin = new google.maps.places.Autocomplete(inputOrigin, options);
    autocompleteOrigin.bindTo('bounds', map);

    var inputDestination = $( "#txtDestination" )[ 0 ];
    autocompleteDestination = new google.maps.places.Autocomplete(inputDestination, options);
    autocompleteDestination.bindTo('bounds', map);
    addListenerSearch(autocompleteOrigin, map, true);
    addListenerSearch(autocompleteDestination, map, false);
}

/**
 * Function that adds a listener to the autocomplete inputs when the value changes
 * @param autocompleteInput the html input field representing the autocomplete
 * @param map the map to which the autocomplete will be bound
 * @param isOrigin boolean telling if the autocomplete is the origin
 */
function addListenerSearch(autocompleteInput, map, isOrigin){
    autocompleteInput.addListener('place_changed', function() {
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

    });
}


function searchRoute(){
    // Clear any previous route boxes from the map
    //clearBoxes();

    // Convert the distance to box around the route from miles to km
    //distance = parseFloat(document.getElementById("distance").value) * 1.609344;
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
         if (status == google.maps.DirectionsStatus.OK) {
             for (var i = 0, len = result.routes.length; i < len; i++) {
                 new google.maps.DirectionsRenderer({
                     map: map,
                     directions: result,
                     routeIndex: i,
                     suppressMarkers: true
                 });
             }
         } else {
             alert("Directions query failed: " + status);
         }
    });
}