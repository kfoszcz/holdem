var Player = require('./Player.js');
var Deck = require('./Deck.js');
var Card = require('./Card.js');
var Combination = require('./Combination.js');

function Game(players, options) {
	this.id = 0;
	this.equities = true; // calculate equities in all-in showdown situation
	this.equitiesN = 100000; // max equity calculation iterations
	this.players = players;
	this.options = options;
	this.paused = true;
	this.running = false;
	this.locked = true; // sending moves not allowed
	this.seats = []; // user for picking a random player

	this.deck = null;
	this.equityDeck = new Deck(1);
	this.phase = Game.PREFLOP;
	this.current = null;
	this.dealer = null;
	this.better = null;
	this.bet = 0;
	this.minRaise = 0;
	this.playersInGame = 0;
	this.playersInHand = 0;
	this.playersAllIn = 0;
	this.playersToAct = 0;
	this.level = 0;
	this.levelMax = this.options.blinds.length - 1;
	this.blindsUp = this.options.blindsUp;
	this.pots = [];
	this.potIndex = 0;
	this.board = [];
	this.request = 0;
	this.winners = [];

	for (var i = 0; i < players.length; i++)
		this.pots.push(0);
}

Game.PREFLOP = 0;
Game.FLOP = 1;
Game.TURN = 2;
Game.RIVER = 3;

Game.ALLIN = 1;
Game.SHOWDOWN = 2;
Game.PHASE = 4;
Game.END_DEAL = 8;
Game.WINNERS = 16;
Game.UPDATE_POT = 32;

Game.prototype.start = function() {
	// init game variables
	this.id = Math.floor(Math.random() * 1000000000) + 1;
	this.running = true;
	this.paused = false;

	// init players variables
	this.players.forEach(function(player, index){
		this.playersInGame++;
		this.seats.push(index);
		player.stack = this.options.startingStack;
	}, this);

	// randomly pick a dealer
	var rnd = Math.floor(Math.random() * this.playersInGame);
	this.dealer = this.players[this.seats[rnd]];

	// create a deck
	this.deck = new Deck(1);
}

Game.prototype.deal = function() {
	// clear pot
	for (var i = 0; i <= this.potIndex; i++)
		this.pots[i] = 0;

	// clear the board
	this.board = [];

	// shuffle the deck
	this.deck.shuffle();

	this.phase = Game.PREFLOP;

	// deal cards and pay antes
	this.players.forEach(function(player, index){
		player.folded = false;
		player.pot = 0; // takes part in main pot
		player.won = [];
		player.receiveHand(this.deck.draw(2));
		player.placeBet(this.ante());
	}, this);

	// move the button
	this.dealer = this.nextPlayer(this.dealer, true);

	// reset pot index to main pot
	this.potIndex = 0;

	// build pot from antes
	if (this.ante() > 0)
		this.buildPot();

	// pay blinds
	this.current = (this.playersInGame == 2) ? this.dealer : this.nextPlayer(this.dealer, true);
	this.current.placeBet(this.smallBlind());
	var largestBet = this.current.bet;
	this.current = this.nextPlayer(this.current, true);
	this.current.placeBet(this.bigBlind());
	largestBet = Math.max(largestBet, this.current.bet);
	this.better = this.current;
	this.current = this.nextPlayer(this.current, true);

	this.playersAllIn = this.players.filter(allIn).length;

	// reset game variables
	this.bet = this.bigBlind();
	this.minRaise = this.bigBlind();
	this.playersInHand = this.playersInGame;
	this.playersToAct = this.playersInGame - this.playersAllIn;

	if (this.playersToAct == 0) {
		this.bet = largestBet;
		this.buildPot();
		this.request = Game.SHOWDOWN | Game.ALLIN | Game.UPDATE_POT;
	}
	else {
		if (this.playersToAct == 1 && this.current.bet == largestBet) {
			this.bet = largestBet;
			this.buildPot();
			this.request = Game.SHOWDOWN | Game.ALLIN | Game.UPDATE_POT;
		}
	}
}

Game.prototype.makeMove = function(move) {
	// if player tries to bet more then he has
	if (move > this.current.stack + this.current.bet) {
		return { success: false, error: 'too short stack' }
	}

	// if player has money to call, but tries to pay less, move is invalid
	if (move != -1 && move < this.bet && this.current.stack + this.current.bet >= this.bet) {
		return { success: false, error: 'less then call chips' };
	}

	// if player tries to raise less then min raise and is not all in, move is invalid
	if (move > this.bet && move < this.bet + this.minRaise && this.current.stack + this.current.bet >= this.bet + this.minRaise) {
		return { success: false, error: 'not a full raise' };
	}

	// if player is not facing a full raise, he can only call
	if (move > this.bet && !this.canCurrentRaise()) {
		return { success: false, error: 'only call possible' };
	}

	// fold
	if (move == -1) {
		this.current.folded = true;
		this.playersInHand--;
		this.playersToAct--;
	}

	// check or call
	else if (move <= this.bet) {
		this.current.placeBet(move);
		this.current.acted = true;
		this.playersToAct--;
		if (this.current.allIn()) {
			this.playersAllIn++;
		}
	}

	// bet or raise
	else {
		this.playersToAct = this.playersInHand - this.playersAllIn - 1;
		this.current.acted = true;

		this.current.placeBet(move);
		if (this.current.allIn()) {
			this.playersAllIn++;
		}
		if (move - this.bet >= this.minRaise)
			this.minRaise = move - this.bet;

		this.bet = move;
		this.better = this.current;
	}

	// if everybody but one folded, remaning player wins the pot
	if (this.playersInHand == 1) {
		this.buildPot();
		this.winners = this.players.filter(inHand);
		this.winners[0].win(this.pots[0]);
		this.winners[0].won.push(this.pots[0]);
		this.request |= Game.END_DEAL;
	}

	// betting round is over with at least 2 players in hand
	else if (this.playersToAct == 0) {
		this.buildPot();
		if (this.phase == Game.RIVER) {
			this.request = Game.SHOWDOWN | Game.WINNERS | Game.UPDATE_POT;
		}
		else if (this.playersAllIn >= this.playersInHand - 1) {
			this.request = Game.SHOWDOWN | Game.ALLIN | Game.UPDATE_POT;
		}
		else {
			this.request = Game.PHASE | Game.UPDATE_POT;
			this.current = this.nextPlayer(this.dealer);
		}
	}

	else
		this.current = this.nextPlayer(this.current);

	// move is valid so we return true
	return { success: true };
}

Game.prototype.initEquityDeck = function() {
	this.equityDeck.shuffle();
	this.players.filter(inHand).forEach(function(player){
		this.equityDeck.drawCard(player.cards[0]);
		this.equityDeck.drawCard(player.cards[1]);
	}, this);
	for (var i = 0; i < this.board.length; i++)
		this.equityDeck.drawCard(this.board[i]);
}

Game.prototype.getEquityWinners = function() {
	var best = 0;
	var winners = [];

	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i] && !this.players[i].folded) {
			this.players[i].value = this.players[i].hand.eval();
			if (this.players[i].value > best) {
				winners = [this.players[i]];
				best = this.players[i].value;
			}
			else if (this.players[i].value == best) {
				winners.push(this.players[i]);
			}
		}
	}

	return winners;
}

Game.prototype.calculateEquities = function() {
	console.log(logTime() + 'Calculating equities...');
	this.initEquityDeck();
	var count = 0;
	var size = 5 - this.board.length;
	var winners = [];
	for (var i = 0; i < this.players.length; i++)
		if (this.players[i])
			this.players[i].equity = 0;

	var iter = new Combination(this.equityDeck.marker, this.equityDeck.deck.length, size);
	do {

		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i] && !this.players[i].folded) {
				this.players[i].hand.clear();
				this.players[i].hand.addCard(this.players[i].cards[0].code);
				this.players[i].hand.addCard(this.players[i].cards[1].code);
				for (var j = 0; j < this.board.length; j++)
					this.players[i].hand.addCard(this.board[j].code);
				for (var j = 0; j < size; j++)
					this.players[i].hand.addCard(this.equityDeck.deck[iter.index[j]].code);
			}
		}

		winners = this.getEquityWinners();
		for (var i = 0; i < winners.length; i++)
			winners[i].equity += 1 / winners.length;

		count++;

	} while (iter.next() && count < this.equitiesN);

	this.players.filter(inHand).forEach(function(player){
		player.equity = Math.round(player.equity * 100 / count);
	}, this);

	console.log(logTime() + '**Count: ' + count);
}

Game.prototype.getEquities = function() {
	var result = [];
	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i] && !this.players[i].folded)
			result.push(this.players[i].equity);
		else
			result.push(null);
	}
	return result;
}

Game.prototype.updateWinners = function() {
	this.winners = [];
	if (this.pots[this.potIndex] == 0)
		this.potIndex--;

	for (var i = 0; i <= this.potIndex; i++) {
		var dbg = '** Pot ' + i + ' ';
		this.winners.push([]);
		var best = 0;
		this.players.filter(inHand).forEach(function(player) {
			if (player.pot >= i)
				dbg += ' | ' + player.name;
			player.won.push(0);

			// if player takes part in pot and has better hand, update best hand
			if (player.pot >= i && player.value > best) {
				this.winners[i] = [player];
				best = player.value;
			}
			// if player takes part in pot and has the same hand as best hand, add him to winners
			else if (player.pot >= i && player.value == best) {
				this.winners[i].push(player);
			}
		}, this);

		console.log(dbg);
		dbg = '** Win ' + i + ' ';

		var chips = Math.floor(this.pots[i] / this.winners[i].length);
		for (var j = 0; j < this.winners[i].length; j++) {
			this.winners[i][j].win(chips);
			this.winners[i][j].won[i] = chips;
		}
		var oddChips = this.pots[i] - chips * this.winners[i].length;
		var oddWinner = this.dealer;
		while (oddChips-- > 0) {
			oddWinner = this.nextPlayer(oddWinner, true);
			oddWinner.win(1);
			oddWinner.won[i] += 1;
		}

		for (var j = 0; j < this.winners[i].length; j++) {
			dbg += ' | ' + this.winners[i][j].name + '(' + this.winners[i][j].won[i] + ')';
		}
		console.log(dbg);
	}
}

Game.prototype.dealBoard = function() {
	if (this.phase == Game.PREFLOP)
		this.board = this.deck.draw(3);
	else
		this.board.push(this.deck.draw(1)[0]);
	this.phase++;

	if (this.phase == Game.RIVER) {
		this.players.filter(inHand).forEach(function(player) {
			player.hand.clear();
			player.hand.addCard(player.cards[0].code);
			player.hand.addCard(player.cards[1].code);
			for (var i = 0; i < 5; i++)
				player.hand.addCard(this.board[i].code);
			player.value = player.hand.eval();
		}, this);
		if (this.request & Game.ALLIN)
			this.request |= Game.WINNERS;
	}
	this.initBettingOrbit();
}

Game.prototype.nextPlayer = function(player, allins) {
	var i = player.seat;
	do {
		i = (i + 1) % this.players.length;
	} while (!this.players[i] || this.players[i].folded || (!allins && this.players[i].allIn()));
	return this.players[i];
}

Game.prototype.ante = function() {
	return this.options.blinds[this.level][2];
}

Game.prototype.smallBlind = function() {
	return this.options.blinds[this.level][0];
}

Game.prototype.bigBlind = function() {
	return this.options.blinds[this.level][1];
}

Game.prototype.getStacks = function() {
	var result = [];
	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i])
			result.push(this.players[i].stack);
		else
			result.push(null);
	}
	return result;
}

Game.prototype.buildPot = function() {
	var best = 0;
	var secondBest = 0;
	var bestPlayer = null;

	var inPot = this.players.filter(chipsCommited);

	inPot.forEach(function(player) {
		if (player.bet > best) {
			secondBest = best;
			best = player.bet;
			bestPlayer = player;
		}
		else if (player.bet == best)
			bestPlayer = null;
		else if (player.bet > secondBest)
			secondBest = player.bet;
	});

	// add overbet chips back to player's stack
	if (bestPlayer) {
		bestPlayer.stack += best - secondBest;
		bestPlayer.bet = secondBest;
	}

	console.log('Best: ' + best + '; Second: ' + secondBest);

	var allIns = inPot.filter(allIn);

	// create side pots for all-ins
	while (allIns.length >= 1) {
		var lowest = this.minBet(allIns);

		inPot.forEach(function(player){
			var toPay = Math.min(lowest, player.bet);
			player.bet -= toPay;
			this.pots[this.potIndex] += toPay;
			if (!player.folded && (player.bet > 0 || !player.allIn()))
				player.pot = this.potIndex + 1;
		}, this);

		inPot = this.players.filter(chipsCommited);
		allIns = inPot.filter(allIn);
		this.potIndex++;
	}

	// add remaining chips to pot
	inPot.forEach(function(player){
		this.pots[this.potIndex] += player.bet;
		player.bet = 0;
	}, this);

	var dbg = ' **Pots ';
	for (var i = 0; i <= this.potIndex; i++)
		dbg += ' | ' + this.pots[i];
	console.log(dbg);
}

Game.prototype.getPotTotal = function() {
	var result = 0;
	for (var i = 0; i <= this.potIndex; i++)
		result += this.pots[i];
	for (var i = 0; i < this.players.length; i++)
		if (this.players[i])
			result += this.players[i].bet;
	return result;
}

Game.prototype.getPots = function() {
	var result = [];
	for (var i = 0; i < this.pots.length; i++) {
		if (this.pots[i] > 0)
			result.push(this.pots[i]);
		else
			break;
	}
	return result;
}

Game.prototype.minBet = function(arr) {
	var result = 1000000000;
	for (var i = 0; i < arr.length; i++)
		if (arr[i] && arr[i].bet > 0 && arr[i].bet < result)
			result = arr[i].bet;
	return result;
}

Game.prototype.initBettingOrbit = function() {
	this.bet = 0;
	this.minRaise = this.bigBlind();
	this.playersToAct = this.playersInHand - this.playersAllIn;
}

Game.prototype.canCurrentRaise = function() {
	return this.bet == 0 || this.bet - this.current.bet >= this.minRaise || !this.current.acted;
}

Game.prototype.getGameState = function(playerSeat) {
	var result = {
		'current': (!this.locked) ? this.current.seat : null,
		'dealer': this.dealer.seat,
		'phase': this.phase,
		'board': this.board,
		'potTotal': this.getPotTotal(),
		'pots': this.getPots(),
		'blindsNow': this.options.blinds[this.level],
		'blindsNext': (this.level < this.levelMax) ? this.options.blinds[this.level + 1] : null,
		'blindsUp': this.blindsUp,
		'players': []
	};

	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i]) {
			result.players.push({
				'stack': this.players[i].stack,
				'bet': this.players[i].bet,
				'folded': this.players[i].folded,
				'cards': (i === playerSeat || ((this.request & Game.ALLIN) && !this.players[i].folded)) ? this.players[i].cards : null
			});
		}
		else {
			result.players.push(null);
		}
	}

	return result;
}

function logTime() {
	var d = new Date();
	return (d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds() + ' ');
}

var allInNow = function(player) {
	return (player && player.bet > 0 && player.allIn());
}

var chipsCommited = function(player) {
	return (player && player.bet > 0);
}

var inHand = function(player) {
	return (player && !player.folded);
}

var allIn = function(player) {
	return (player && player.allIn());
}

var inAction = function(player) {
	return (player && !player.folded && !player.allIn());
}

module.exports = Game;
