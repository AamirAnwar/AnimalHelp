var express = require("express");
var app = express();
var mongoose = require("mongoose");
const PORT = 3000;

app.set('view engine', 'ejs');

// Setup DB
mongoose.connect('mongodb://localhost/clinics');
var Schema = mongoose.Schema, objectId = Schema.ObjectId;

var clinicSchema = new Schema({
	author:objectId,
	name: String,
	date: {type: Date, default: Date.now}

});

// Clinic model
var ClinicModel = mongoose.model("clinic", clinicSchema)

// DB Helpers
const FindClinics = function(callback) {

	ClinicModel.find({}).exec((function(err, docs) {
		if (err) {
			console.log(err);
			callback(null);
		}
		else {
			console.log('Found the following clinics');
			console.log(docs);
			callback(docs);
			// callback(null);
		}
	}));

}

// Routes
app.get("/", function(req,res) {
	// res.send("Hello World!");
	res.render('home');

});

app.get("/clinics", function(req,res){
	FindClinics(function(clinics){
		var names = [];
		clinics.forEach(function(clinic) {
			names.push(clinic.name);
		})

		if (clinics !== null) {
			// res.send('We have ' + names.length + ' clinics in our database');
			res.render('clinics', {names:names});

		}
		else {
			res.send("There was a problem at the backend");	
		}
		
	});
});


app.get("*", function(req,res) {
	res.send("Nothing here!");

});

// Start server
app.listen(PORT, function() {
	console.log("Port started on " + PORT);
})

