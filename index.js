var express = require("express");
var app = express();
var mongoose = require("mongoose");
const PORT = 3000;




app.get("/", function(req,res) {
	res.send("Hello World!");

});

app.get("/tags/:tagname", function(req,res) {


	res.send("You are on the " + req.params.tagname + " page");

});

app.get("*", function(req,res) {
	res.send("Nothing here!");

});

app.listen(PORT, function() {
	console.log("Port started on " + PORT);
})

