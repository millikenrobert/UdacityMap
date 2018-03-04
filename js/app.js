//Global variables
var map;
var bikeAPI = "https://data.melbourne.vic.gov.au/resource/qnjw-wgaj.json";
var fourSquareClientID = "STPR3A3KB0HXYJL3Z0PT5TGIJVW4BLZIL0XV3BNJNHS1WRR3";
var fourSquareSecretID = "AOQ52SIEMJMKGWHYZFAVVZ2PMJS2AW3KLFGJMK5C35D02BEQ";



var bounds;
var infoWindow;
var bikeLocations;

//Marker object
var bikeMarker = function(data) {
    var self = this;
    var smartIcon = null;
    var FourResults;


    //different Icon types indicating capacity
    var defaultIconNone = makeMarkerIcon('ff0000'); //red
    var defaultIconHigh = makeMarkerIcon('0066ff'); //blue
    var defaultIconMed = makeMarkerIcon('33cc33'); //green
    var defaultIconLow = makeMarkerIcon('cccc00'); //yellow
    var highlightedIcon = makeMarkerIcon('dcf5e9'); //light


    this.visible = ko.observable(true);
    this.featurename = data.featurename;
    this.nbBikes = data.nbbikes;
    this.nbEmpty = data.nbemptydoc;
    this.lastMod = data.uploaddate;
    this.location = { lat: data.coordinates.coordinates[1], lng: data.coordinates.coordinates[0] };



    $.getJSON('https://api.foursquare.com/v2/venues/search?ll=' + data.coordinates.coordinates[1] + ',' + data.coordinates.coordinates[0] + '&client_id=' + fourSquareClientID + '&client_secret=' + fourSquareSecretID + '&v=20160118&query=bike').done(function(data) {
        FourResults = data.response.venues[0];

    }).fail(function() {
        alert('Something went wrong with foursquare');
    });


    //see if number of bikes is low, medium or high availability
    if (this.nbBikes < 1) {
        smartIcon = defaultIconNone;
    } else if (this.nbBikes <= 5) {
        smartIcon = defaultIconLow;
    } else if (this.nbBikes > 5 && this.nbBikes <= 10) {
        smartIcon = defaultIconMed;
    } else {
        smartIcon = defaultIconHigh;
    }


    this.marker = new google.maps.Marker({
        position: this.location,
        map: map,
        title: this.featurename,
        available: this.nbBikes,
        taken: this.nbEmpty,
        icon: smartIcon,
        original: smartIcon,
        animation: null
    });

    //Initialise the setAnimation
   // this.marker.setAnimation(null)


    //add listener for infoWindow, create object
    this.marker.addListener('click', function() {
        populateInfoWindow(this, infoWindow, FourResults);
        map.panTo(this.getPosition());
        toggleBounce(this);
    });


    //on mouseover, set the icon to highlight colour
    this.marker.addListener('mouseover', function() {
        this.setIcon(highlightedIcon);
    });

    //on mouseout, return the icon to previous colour
    this.marker.addListener('mouseout', function() {
        this.setIcon(this.original);
    });

    //add marker to maps and set bounds
    self.filterMarkers = ko.computed(function() {
        if (self.visible() === true) {
            self.marker.setMap(map);
            bounds.extend(self.marker.position);
            map.fitBounds(bounds);
        } else {
            self.marker.setMap(null);
        }
    });

    //show the marker on click
    this.show = function(location) {
        //toggleBounce(self.marker);
        google.maps.event.trigger(self.marker, 'click');
    };


    //Mouseover for menu animation
    this.enableDetails = function(location) {
        self.marker.setIcon(highlightedIcon);
    };

    //Mouseoff for menu animation
    this.disableDetails = function(location) {
        self.marker.setIcon(smartIcon);
    };



    self.marker.setMap(map);
};





//google maps InitMaps call
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -37.836323, lng: 144.975162 },
        zoom: 2
    });

    //load the bike points from API
    loadJson();
    bounds = new google.maps.LatLngBounds();
    infoWindow = new google.maps.InfoWindow();
}

//set the view model
var ViewModel = function() {
    var self = this;
    this.searchItem = ko.observable('');
    this.mapBikes = ko.observableArray([]);

    //for each of the bike locations from the API, add the markers
    bikeLocations.forEach(function(location) {
        self.mapBikes.push(new bikeMarker(location));
    });

    //populate the locations lists
    this.locationList = ko.computed(function() {
        // var searchFilter = self.searchItem();
        var searchFilter = self.searchItem().toLowerCase();
        if (searchFilter) {
            return ko.utils.arrayFilter(self.mapBikes(), function(location) {
                var str = location.featurename.toLowerCase();
                // var str = location.title;
                var result = str.includes(searchFilter);
                location.visible(result);
                return result;
            });
        }
        self.mapBikes().forEach(function(location) {
            location.visible(true);
        });
        return self.mapBikes();
    }, self);
};

//load the bike json
function loadJson() {
    $.getJSON(bikeAPI, function(data) {
        bikeLocations = data;
    }).done(function() {
        ko.applyBindings(new ViewModel());
    }).fail(function() {
        alert("An error has occured, try again");
    });
}

//make the google marker
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
        '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34));
    return markerImage;
}

//make the Infowindow data
function populateInfoWindow(marker, infowindow, FourResults) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('<div style="color:#000000">' + FourResults.name + '<p>' + marker.title + '</div><div style="color:#000000">Available:' + marker.available + '</div><div style="color:#000000">Taken:' + marker.taken + '</p><p><img src="img\\pb4sq.png" height="20"></p></div>');
        infowindow.marker = marker;

        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });


        infowindow.open(map, marker);

    }
}

//Throw alert message on googles maps fail to load
function mapsError() {
    alert("Google maps error, try to reload");
}

//make bounce animatonss
function toggleBounce(marker) {


    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);

    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setIcon(marker.original);
            marker.setAnimation(null);
        }, 2000);
    }
}
