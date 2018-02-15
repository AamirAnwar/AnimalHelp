require('dotenv').config()
var express = require("express");
var app = express();
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
const PORT = process.env.PORT|| 3000;

const delhi_lat = 28.7041;
const delhi_lon = 77.1025;
const delhi_city_id = 1

// Set template engine as ejs (doing this lets us omit the .ejs extension)
app.set('view engine', 'ejs');

// Settings the static content root directory (think css)
app.use(express.static('public'));

// Set express to use body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// Setup DB
// const mongoConnectURL = 'mongodb://localhost/watchdog_v1';
const mongoConnectURL = 'mongodb://'+ process.env.DB_USER + ':' + process.env.DB_PASS +'@ds237858.mlab.com:37858/watchdog_v1';
mongoose.connect(mongoConnectURL)

var Schema = mongoose.Schema;
var objectId = Schema.ObjectId;

// Schemas
var citySchema = new Schema({
	city_id:Number,
	name:String,
	country_code:String,
	lat:Number,
	lon:Number
});

var missingPetSchema = new Schema({
	name:String,
	type:String,
	breed:String,
	desc:String,
	colour:String,
	age:String,
	owner_contact:String,
	missing_since:String,
	last_known_location:String,
	date_posted: {type:Date, default:Date.now},
	distiguishing_feature: String,
	reward:String,
	lat:Number,
	lon:Number,
	city:citySchema
});

var clinicSchema = new Schema({
	name: String,
	address:String,
	phone:String,
	lat:Number,
	lon:Number,
	city:citySchema,
	date: {type: Date, default: Date.now}
});

// Models
var Clinic = mongoose.model("clinic", clinicSchema);
var City = mongoose.model("Citie", citySchema);
var MissingPet = mongoose.model("MissingPet",missingPetSchema);

// DB Helpers
const FindClinics = function(city_id,callback) {
	Clinic.find({"city.city_id":city_id}).lean().exec((function(err, docs) {
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

const GetCity = function(city_id, callback) {
	City.findOne({city_id:city_id}, function(err, city) {
		callback(err,city);
	});
}

const FindMissingPets = function(city_id, callback) {
	MissingPet.find({}, function(err, missing_pets){
		if (err) {
			console.log(err);
			callback([]);
		}
		else {
			callback(missing_pets);
		}
		
	});
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

app.get("/missingpets/search", function(req, res) {
	var cityID = req.query.city_id;
	if (cityID == null) {
		res.json({message:"City ID is needed!"});
	}

	var queryString = req.query.q;

	if (queryString == null) {
		res.json({message:"Empty query!"});
	}
	res.json({pets:[]});
});


app.get("/clinics", function(req,res){
	var lat = Number(req.query.lat);
	var lon = Number(req.query.lon);
	if (!(lat && lon)) {
		res.json({message: 'lat lon are needed!'});
		return;
	}
	// Only available in Delhi for now. Check against it's lat and lon
	if (isNearDelhi(lat, lon) == false) {
		callback();
		return
	}

	FindClinics(delhi_city_id,function(clinics){
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

			if (isAppleRequest(req)) {
				if (clinics.length > 0) {
					if (clinics[0].distance < 150) {
						res.json({clinics:clinics});
						return;
					}
				}
				res.json({clinics:[]})
				
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
	City.find({}, function(err, cities){
		if (err) {
			res.json({err:err});
		}
		else {
			res.json({cities:cities});
		}

	});
});

app.get("/about",function(req,res){
	res.render('about');
});

app.get("/missingpets",function(req,res){
	console.log("Show missing pets");
	if (isAppleRequest(req)) {
		FindMissingPets(delhi_city_id, function(pets) {
			console.log(pets);
			res.json({pets:pets});
		});
	}
	else {
		res.render('add_missing_pet');
	}
});

app.post("/missingpets", function(req, res){
	var pet = new MissingPet(req.body);
	pet.desc = pet.desc.trim();
	pet.save(function(err, missing_pet) {
		if (err) {
			res.json({status:"failed",err:err});
		}
		else {
			res.json({status:"success",pet:pet});
		}
	});
});


app.get("*", function(req,res) {
	res.send("Nothing here!");

});

function findNearestClinic(lat, lon, callback) {
	if (isNearDelhi(lat, lon) == false) {
		callback();
		return;
	}

	FindClinics(delhi_city_id,function(clinics) {
		var nearestClinic;
		var minDistance = Number.MAX_SAFE_INTEGER;

		clinics.forEach(function(clinic) {
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


function isNearDelhi(lat,lon) {
	// Only available in Delhi for now. Check against it's lat and lon
	var distance = calculateDistance(lat, lon, delhi_lat, delhi_lon, 'K');
	console.log(distance);	
	return (distance < 200);
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

function isAppleRequest(req) {
	return req.headers.user_client === "ios"
}

// Start server
app.listen(PORT, function() {
	console.log("Port started on " + PORT);
})

