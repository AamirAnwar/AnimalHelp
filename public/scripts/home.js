var lat,lon;
function showPosition() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position){
            var positionInfo = "Your current position is (" + "Latitude: " + position.coords.latitude + ", " + "Longitude: " + position.coords.longitude + ")";
            lat = position.coords.latitude;
            lon = position.coords.longitude;
            document.getElementById('loading_animation').classList.add('spinner');
            setTimeout(function(){
                window.location.href = '/?lat='+lat+'&lon='+lon;
                
            }, 2000);
            
        });
    } else {
        console.log("Sorry, your browser does not support HTML5 geolocation.");
    }
}
