var express = require("express");
var app = express();
var mongoose = require("mongoose");


app.get("/", function(req,res) {
	res.send("Hello World!");

});

const PORT = 3000;


app.listen(PORT, function() {
	console.log("Port started on " + PORT);
})

