/*
 * Welcome to JSApp.US
 * ctrl-b to run the current code on the server
 * ctrl-l to login/make a new user
 * ctrl-h for help
 *
 * For more command check out the command window at the bottom
 * commands: test login/logout newuser new save open ls deploy
 */

var http = require('http');
var cheerio = require('cheerio');

var fs = require("fs");
var port = 13137;
var express = require("express");
var cacheData = "";
var cacheExpirationDate = new Date();
var app = express();
app.use(express.static(__dirname + "/public")); //use static files in ROOT/public folder

app.get("/getData", function(request, response)
{
	if ((cacheData == "") || (cacheExpirationDate >= new Date())) getData();

	response.end(cacheData);
});

app.listen(port);

getData();

function getData()
{
	http.get("http://www.lbma.org.uk/pages/?page_id=54&title=silver_fixings&show=2013&type=daily", function(res) {
	  var html = "";

	  res.on('data', function(chunk)
	  {
	  	html += chunk.toString();
	  }); 

	  res.on('end', function()
	  {
	  	$ = cheerio.load(html);
		var exportLength = 10;
	  	var priceArr = [];
	  	var responseArr = [];
	  	var i = 0;
	  	var completed = false;
	  	while ((i < $('table.pricing_detail > tr').length)&&(!completed))
	  	{
	  		var $row = $('table.pricing_detail > tr').eq(i);

	  		var str_price = $row.find(':nth-child(2)').text();

			var d = new Date($row.find(':nth-child(1)').text());
			var curr_date = d.getDate();
			var curr_month = d.getMonth() + 1; //Months are zero based
			var curr_year = d.getFullYear();

	  		if (str_price != "")
	  		{
	  			var price = parseFloat(str_price);
	  			priceArr[i] = {
		            date: curr_month + "/" + curr_date + "/" + curr_year,
		            price: Math.floor(price) / 100,
	          	};
	          	i++;
	  		}else{
	  			priceArr[i] = {
		            date: curr_month + "/" + curr_date + "/" + curr_year,
		            price: -1,
	          	};
	          	completed = true;
	  		}  		
	  	};
		
		var labelArr = [];
		var vmaUpperBoundArr = [];
		var vmaLowerBoundArr = [];
		var vmaPriceArr = [];
		var f_date;
		var f_vmaUpperBound = 0;
		var f_vmaLowerBound = 0;

		console.log(i-exportLength);

		if (i>=(3 + exportLength))
		{		
			for (var j=(i-exportLength); j<=i; j++)
			{			
				var index = j-(i-exportLength);
				console.log(index);
				labelArr[index] = priceArr[j].date;
				vmaUpperBoundArr[index] = toFixed((priceArr[j - 1].price + priceArr[j - 2].price) / 2);
				vmaLowerBoundArr[index] = toFixed((priceArr[j - 1].price + priceArr[j - 2].price + priceArr[j - 3].price) / 3);
				if (j<i) 
					vmaPriceArr[index] = toFixed(priceArr[j].price);
				else
				{
					f_date = priceArr[j].date;
					f_vmaUpperBound = vmaUpperBoundArr[index];
					f_vmaLowerBound = vmaLowerBoundArr[index];
				}
			}
		}

		var data = {
			labels: labelArr,
			datasets: [
			{			
				fillColor : "rgba(255,255,255,0)",
				strokeColor : "rgba(0,121,41,1)",
				pointColor : "rgba(0,121,41,1)",
				pointStrokeColor : "#fff",
				data: vmaUpperBoundArr
			},
			{
				fillColor : "rgba(255,255,255,0)",
				strokeColor : "rgba(166,26,0,1)",
				pointColor : "rgba(166,26,0,1)",
				pointStrokeColor : "#fff",
				data : vmaLowerBoundArr
			},
			{
				fillColor : "rgba(255,255,255,0)",
				strokeColor : "rgba(50,50,50,1)",
				pointColor : "rgba(50,50,50,1)",
				pointStrokeColor : "#fff",
				data : vmaPriceArr
			}
			],
			forecast: {
				date: f_date,
				upperbound: f_vmaUpperBound,
				lowerbound: f_vmaLowerBound
			}
		}

		cacheData = JSON.stringify(data);
		cacheExpirationDate = addMinutes(new Date(), 60);
		console.log(cacheExpirationDate);
		console.log(cacheData);
	  });
	}).on('error', function(e) {
	  console.log("Got error: " + e.message);
	});
}

function toFixed(number)
{
	return Math.floor(number * 100) / 100;
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}