require('dotenv').config()
var express = require("express");
var app = express();
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
const PORT = process.env.PORT|| 3000;

// Set template engine as ejs (doing this lets us omit the .ejs extension)
app.set('view engine', 'ejs');

// Settings the static content root directory (think css)
app.use(express.static('public'));

// Set express to use body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// Setup DB
// const mongoConnectURL = 'mongodb://localhost/clinics';
const mongoConnectURL = 'mongodb://'+ process.env.DB_USER + ':' + process.env.DB_PASS +'@ds123926.mlab.com:23926/animal_help';
mongoose.connect(mongoConnectURL)

var Schema = mongoose.Schema, objectId = Schema.ObjectId;

var clinicSchema = new Schema({
	author:objectId,
	name: String,
	address:String,
	city:String,
	lat:Number,
	lon:Number,
	date: {type: Date, default: Date.now}

});

// Clinic model
var ClinicModel = mongoose.model("clinic", clinicSchema)

// DB Helpers
const FindClinics = function(callback) {

	ClinicModel.find({}).lean().exec((function(err, docs) {
		if (err) {
			console.log(err);
			callback(null);
		}
		else {
			// console.log('Found the following clinics');
			// console.log(docs);
			callback(docs);
		}
	}));

}

// Routes
app.get("/", function(req,res) {
	var lat = Number(req.query.lat);
	var lon = Number(req.query.lon);
	if (lat && lon) {
		findNearestClinic(lat, lon, function(distance, clinic) {
			res.render('home', {distance:distance, clinic:clinic});

		});
	}
	else {
		res.render('home', {distance:undefined, clinic:undefined});
	}


});

app.get("/missing_pets",function(req,res){
	var cityID = req.query.city_id;
	if (cityID == null) {
		res.json({message:"City ID is needed!"});
	}


	var dummyJSON = {
		type:"Dog",
		breed:"Husky",
		age:"2 years",
		owner_contact:"+919811588962",
		missing_since:"4 weeks",
		reward:"2000 rupees",
		last_known_location:"Galleria Market, DLF phase 4 ,Gurgaon",
		description: "Dummy description Dummy description Dummy description Dummy description Dummy description Dummy description",
		distiguishing_features:"red mark on forehead",
		image_url:"https://i.pinimg.com/736x/bc/be/e6/bcbee6931f71db0d1629355bd61fe8cd--wolves-mans.jpg"
	};

	var pets = [];
	for (var i = 0; i < 10; i++) {
		pets[i] = dummyJSON;
	}
	// TODO find missing pets based on city ID 
	res.json({
		pets:pets
	});

});


app.get("/clinics/all", function(req,res){
	FindClinics(function(clinics){
		var names = [];
		clinics.forEach(function(clinic) {
			names.push(clinic.name);
		})

		if (clinics !== null) {
			res.json({names:names});

		}
		else {
			res.send("There was a problem at the backend");	
		}

	});

});

app.get("/clinics", function(req,res){
	var lat = Number(req.query.lat);
	var lon = Number(req.query.lon);
	if (!(lat && lon)) {
		res.json({message: 'lat lon are needed!'});
		return;
	}

	FindClinics(function(clinics){
		if (clinics !== null) {

			clinics.forEach(function(clinic) {
				var cLat = clinic.lat;
				var cLon = clinic.lon;
				clinic.distance = calculateDistance(lat, lon, cLat, cLon, 'K');
				clinic.distance = parseFloat(clinic.distance.toFixed(2));
			});
			
			clinics.sort(function(a,b) {
				return a.distance - b.distance;
			});

			if (req.headers.user_client === "ios") {
				res.json({clinics:clinics});
			}
			else {
				res.render('clinics', {clinics:clinics});
			}
		}
		else {
			res.send("There was a problem at the backend");	
		}
		
	});
});

app.get("/clinics/nearest", function(req, res) {
	console.log(req.headers);
	var lat = Number(req.query.lat);
	var lon = Number(req.query.lon);
	if (!(lat && lon)) {
		res.json({message: 'lat lon are needed!'});
	}
	else {
		findNearestClinic(lat, lon, function(distance, clinic){
			if (distance && clinic) {
				clinic.distance = parseFloat(distance.toFixed(2));
				res.json({clinic:clinic});
			}
			else {
				res.json({
					success: false,
					error: 'Something went wrong'
				})
			}

		});
	}
});

app.get("/active_cities", function(req, res){
	res.json({
		cities: [
		{
			id:"1",
			name:"Delhi"

		},

		{
			id:"2",
			name:"Mumbai"

		}

		]

	});
});


app.get("*", function(req,res) {
	res.send("Nothing here!");

});

function findNearestClinic(lat, lon, callback) {
	FindClinics(function(clinics) {
		var nearestClinic;
		var minDistance = Number.MAX_SAFE_INTEGER;

		clinics.forEach(function(clinic){
			var cLat = clinic.lat;
			var cLon = clinic.lon;
			var distance = calculateDistance(lat, lon, cLat, cLon, 'K')
			if (distance < minDistance || minDistance === undefined) {
				minDistance = distance;
				nearestClinic = clinic;
			}
		});
		if (minDistance && nearestClinic) {
			callback(minDistance, nearestClinic);
		}
		else {
			callback();
		}
	});

}


function calculateDistance(lat1, lon1, lat2, lon2, unit) {
	var radlat1 = Math.PI * lat1/180
	var radlat2 = Math.PI * lat2/180
	var theta = lon1-lon2
	var radtheta = Math.PI * theta/180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist)
	dist = dist * 180/Math.PI
	dist = dist * 60 * 1.1515
	if (unit=="K")  { 
		dist = dist * 1.609344 
	}
	if (unit=="N") {
		dist = dist * 0.8684 
	}
	return dist
}


// Start server
app.listen(PORT, function() {
	console.log("Port started on " + PORT);
})

