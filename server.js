var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var striptags = require('striptags');

var Table = require('./Table.js');
var Card = require('./Card.js');
var Player = require('./Player.js');
var Game = require('./Game.js')
var Options = require('./Options.js');

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public/img'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function(){
	console.log('Listening on 3000');
});

var structure = 'heads-up-turbo';
var table = new Table(1);

function removeBusted() {
	table.game.players.forEach(function(player){
		if (player && player.allIn()) {
			player.socket.emit('receiveChat', 'You finished the tournament.');
			io.emit('tableUpdate', player.seat, null);
			table.game.playersInGame--;
			table.removePlayer(player.seat);
		}
	});
	if (table.game.playersInGame == 1) {
		table.game.players.forEach(function(player){
			if (player) {
				player.socket.emit('receiveChat', 'Congratulations! You won the tournament!');
				player.socket.broadcast.emit('receiveChat', player.name + ' won the tournament.');
				io.emit('tableUpdate', player.seat, null);
				table.game.playersInGame--;
				table.removePlayer(player.seat);
			}
		});
		endGame();
	}
	else
		newDeal();
}

function endGame() {
	io.emit('endGame');
	delete table.game;
}

function newDeal() {
	if (table.game.level < table.game.levelMax && --table.game.blindsUp == 0) {
		table.game.blindsUp = table.game.options.blindsUp;
		table.game.level++;
		if (table.game.level == table.game.levelMax)
			io.emit('updateBlinds', table.game.options.blinds[table.game.level], null);
		else
			io.emit('updateBlinds', table.game.options.blinds[table.game.level], table.game.options.blinds[table.game.level + 1]);
	}
	if (table.game.level < table.game.levelMax)
		io.emit('updateBlindsUp', table.game.blindsUp);
	table.game.deal();
	io.emit('updateDealer', table.game.dealer.seat);
	io.emit('receiveHand', null);
	table.game.players.forEach(function(player){
		if (player) {
			player.socket.emit('receiveHand', player.cards);
			io.emit('initHand', player.seat, player.bet, player.stack);
		}
	});
	io.emit('updatePots', { pots: table.game.getPots(), total: table.game.getPotTotal(), clearBets: false });
	moveCallback();
}

function nextPhase() {
	table.game.dealBoard();

	switch (table.game.phase) {

	case Game.FLOP:
		io.emit('receiveFlop', table.game.board);
		break;

	case Game.TURN:
		io.emit('receiveTurn', table.game.board[3]);
		break;

	case Game.RIVER:
		io.emit('receiveRiver', table.game.board[4]);
		break;

	}

	moveCallback();
}

function requestMove() {
	var minRaise = (table.game.canCurrentRaise() && table.game.playersAllIn < table.game.playersInHand - 1) ? table.game.minRaise : 0;
	table.game.current.socket.emit('requestMove', table.game.bet, minRaise);
	table.game.current.socket.broadcast.emit('updateCurrentPlayer', table.game.current.seat);
	table.game.locked = false;
}

function showWinners(i, tm) {
	setTimeout(function() {
		for (var j = 0; j < table.game.winners[i].length; j++) {
			io.emit('handWinner', table.game.winners[i][j].seat, table.game.winners[i][j].won[i], table.game.winners[i][j].stack);
		}
	}, tm);
}

function moveCallback() {
	if (table.game.request == 0)
		requestMove();

	else {
		io.emit('updateCurrentPlayer', null);
		table.game.locked = true;
	}

	if (table.game.request & Game.UPDATE_POT) {
		table.game.request -= Game.UPDATE_POT;

		setTimeout(function() {
			io.emit('updatePots', { pots: table.game.getPots(), total: table.game.getPotTotal(), clearBets: true });
			if (table.game.request & Game.ALLIN) {
				table.game.players.forEach(function(player){
					if (player && !player.folded && !player.allIn()) {
						io.emit('updateStack', player.seat, player.stack);
					}
				});
			}
		}, 400);
	}

	if (table.game.request & Game.PHASE) {
		table.game.request -= Game.PHASE;
		
		setTimeout(function() {
			nextPhase();
		}, 1000);
	}

	if (table.game.request & Game.SHOWDOWN) {
		table.game.request -= Game.SHOWDOWN;

		table.game.players.forEach(function(player){
			if (player && !player.folded) {
				player.socket.broadcast.emit('showCards', player.seat, player.cards);
			}
		});
	}

	if (table.game.request & Game.ALLIN) {
		setTimeout(function() {
			if (table.game.equities) {
				table.game.calculateEquities();
				io.emit('updateEquities', table.game.getEquities());
			}
		}, 500);
	}

	if (table.game.request & Game.WINNERS) {
		table.game.request -= Game.WINNERS;
		if (table.game.request & Game.ALLIN)
			table.game.request -= Game.ALLIN;
		table.game.updateWinners();

		// debug
		for (var i = 0; i <= table.game.potIndex; i++) {
			for (var j = 0; j < table.game.winners[i].length; j++) {
				console.log(table.game.winners[i][j].name + ' wins ' + table.game.winners[i][j].won[i]);
			}
		}

		table.game.players.forEach(function(player){
			if (player && !player.folded) {
				io.emit('showValue', player.seat, player.value);
			}
		});
		var tm = 1500;
		for (var i = 0; i <= table.game.potIndex; i++) {
			showWinners(i, tm);
			tm += 500;
		}
		setTimeout(removeBusted, tm + 500);
	}

	if (table.game.request & Game.END_DEAL) {
		table.game.request -= Game.END_DEAL;
		setTimeout(function() {
			var winner = table.game.winners[0];
			io.emit('handWinner', winner.seat, winner.won[0], winner.stack);
		}, 500);
		setTimeout(removeBusted, 1500);
	}

	if (table.game.request & Game.ALLIN) {
		var tout = (table.game.phase == Game.PREFLOP) ? 3000 : 2000;
		setTimeout(function() {
			nextPhase();
		}, tout);
	}

}

function processMove(socket, move) {
	if (!table.game || !table.game.running || table.game.paused || table.game.locked)
		return false;

	move = parseInt(move);
	var current = table.game.current;
	var result = table.game.makeMove(move);

	var logText = result.success ? 'OK' : result.error;
	console.log('Received move ' + move + ' -> ' + logText);

	if (!result.success)
		return false;

	socket.emit('moveOK', move, current.stack);
	socket.broadcast.emit('receiveMove', current.seat, move, current.stack);

	moveCallback();
}

io.on('connection', function(socket){

	// initial connection
	var ipAddr = socket.request.connection.remoteAddress;
	ipAddr = ipAddr.slice(ipAddr.lastIndexOf(':') + 1);
	if (ipAddr == '1')
		ipAddr = 'localhost';
	console.log(ipAddr);
	// socket.broadcast.emit('receiveChat', 'Połączenie z ' + ipAddr);
	

	// disconnect
	socket.on('disconnect', function(){
		// console.log('User ' + socket.name + ' disconnected');
		var player = table.findPlayerById(socket.id);
		if (player) {
			if (!table.game || !table.game.running) {
				table.removePlayer(player.seat);
				socket.broadcast.emit('tableUpdate', player.seat, null);
			}
			else {
				table.game.paused = true;
				player.connected = false;
				// socket.broadcast.emit('tableUpdate', player.seat, null, true);
				// player.status = 'disconnected';
				socket.broadcast.emit('updatePlayerConnection', player.seat, false);
			}
			// socket.broadcast.emit('receiveChat', 'User <b>' + player.name + '</b> has disconnected.');
		}
	});

	// connect
	socket.on('hello', function(gameId, seat, name) {
		socket.emit('tableStatus', table.getPlayers());
		var player = table.findPlayerByName(name);

		if (table.game && table.game.running) {
			if (player) {
				console.log('CONNECT');
				console.log(gameId + ' gameid ' + table.game.id);
				console.log(seat + ' seat ' + player.seat);
			}

			// player has reconnected
			if (player && gameId === table.game.id && seat === player.seat && !player.connected) {
				socket.name = name;
				player.socket = socket;
				player.connected = true;
				table.game.paused = false;
				socket.broadcast.emit('updatePlayerConnection', player.seat, true);
				socket.emit('gameState', table.game.getGameState(seat), seat, name);

				if (table.game.current.seat === seat && !table.game.locked)
					requestMove();
			}

			// player is an observer
			else {
				socket.emit('gameState', table.game.getGameState(null));
			}
		}
		else if (!player) {
			socket.name = name;
		}
	});

	// sit a player
	socket.on('seatRequest', function(seat, name){
		if (!table.game || !table.game.running) {
			var result = table.addPlayer(seat, new Player(socket, name));
			socket.name = name;
			console.log('User #' + socket.id + ' changed name to ' + socket.name);
			if (result) {
				socket.emit('seatOK', seat, name);
				socket.broadcast.emit('tableUpdate', seat, {'name': name});
			}
		}
	});

	// player hits ready button
	socket.on('playerReady', function(){
		var player = table.findPlayerById(socket.id);
		if (player) {
			player.ready = true;
			if (table.playersReady()) {
				table.game = new Game(table.players, Options[structure]);
				table.game.start();
				io.emit('startGame', table.game.getStacks(), table.game.options.blinds[0], table.game.options.blinds[1], table.game.blindsUp, table.game.id);
				setTimeout(function() {
					newDeal();
				}, 1000);
			}
		}
	});

	socket.on('sendMove', function(move){
		var player = table.findPlayerById(socket.id);
		if (player.id == table.game.current.id) {
			processMove(socket, move);
		}
	});

	// chat
	socket.on('chatMsg', function(msg){
		if (msg[0] === ':') {
			var args = msg.slice(1).split(' ', 2);
			executeCmd(socket, args[0], args[1]);
			return;
		}
		var sender = (socket.name != null) ? socket.name : 'Guest';
		striptags(msg);
		console.log('Message from ' + sender + ': ' + msg);
		io.emit('receiveChat', msg, sender);
	});

});
