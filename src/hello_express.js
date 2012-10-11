var express = require('express')
  , app = express.createServer()
  , io = require('socket.io').listen(app);

function sortNumber(a,b)
{
	return a - b;
}

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.use("view engine", "ejs");
	app.use(express.static(__dirname+"/../docroot"));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
});

app.get('/', function (req, res) { 
	res.redirect('/index.html');
});

app.get('/joinin', function (req, res) {
	res.redirect('/joinin.html');
});

app.get('/publish', function (req, res) {
	res.redirect('/publish.html');
});

var clients = {};
var clientlen = 0;
var merge_sendlen = 0;
var merge_recieved = 0;
var resultArray = [];
var result_flag = true;
var publisher = null;

io.sockets.on('connection', function (socket) {

	socket.on('register', function (data) {
		clients[socket.id] = socket;
		clientlen++;
		if(publisher){
			publisher.emit("strength",{strength:clientlen});
		}
			
	});
  
	socket.on('call', function (data) {
		var code = data.code;
		var d = data.data;
		//console.log("code:"+code+", data:"+data);
		
		prefix = "var fun = ";
		try {
            //console.log(fun)
    		for (i in clients) {
    		    clients[i].emit('eval', {args:d.split(","), func:prefix + code, prefix: 'fun'});
    		}
        } catch(e) { console.log(e); }

		// var arr = d.split(",");
		// console.log("arr:"+arr);
		// resultArray = fun.apply(fun,arr);
		
		//publisher.emit('result',{'result':resultArray});
	});

	socket.on('resultPosting', function(data) {
		if(publisher)
			publisher.emit('result', {result:data.result, data:data.data});
	});
		
	socket.on('callsort', function (data) {
		merge_sendlen = 0;
		console.log("In callsort");
		arr = data.data;
//		console.log("data recieved:"+str+"and type:");
//		console.log(typeof str)
//		merge_sendlen = 0;
//		var arr = str.split(",");
		var inc = arr.length / clientlen;
		var i = 0;
		for(var id in clients) {
			try{
				clients[id].emit('runsort',{'array':arr.slice(i, i+inc)});
				console.log("Array sending:"+arr.slice(i, i+inc));
				i+=inc;
				merge_sendlen++;
			} catch(e) { console.log(e); }
		}
	});
	
	socket.on('sort_result',function(data){
		console.log("inside sort_result");
		resultArray = resultArray.concat(data.result);
		console.log("result arr="+resultArray);
		resultArray.sort(sortNumber);
		merge_recieved++;
		if(merge_sendlen<=merge_recieved){
			if(publisher)
				publisher.emit('resultsort',{'result':resultArray});
		}
	});

	socket.on('disconnect', function () {
		if(clients[socket.id]){
			clientlen--;
			if(publisher){
				publisher.emit("strength",{strength:clientlen});
			}
		}
		delete clients[socket.id];
		if(publisher==socket){
			publisher = null;
		}
	});
  
	socket.on('publisher', function () {
		if(publisher == null){
			publisher = socket;
			publisher.emit("strength",{strength:clientlen});
		}
	});
	
});

var client = 0;
app.listen(8888);
