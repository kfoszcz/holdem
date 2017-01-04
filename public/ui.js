var players = [];
var tableSize = 9;
var socket;
var mySeat = 0;
var seated = false;
var minBet = 0;
var maxBet = 0;
var toCall = 0;
var step = 20;
var me = null;
var pot = 0;
var phase = 0;
var prevBet = 0;
var blindsUpIn = 0;
var smallBlind;
var bigBlind;
var playersInGame = 0;
var started = false;
var lang = 'en';

$(document).ready(function(){

	socket = io();

	$('#username').focus();

	for (var i = 0; i < tableSize; i++)
		players.push(null);

	$('div.player .button.seat').each(function(index){
		$(this).click(function(){
			if ($('#username').val())
				socket.emit('seatRequest', index, $('#username').val());
		});
	});

	$('#language').change(function() {
		lang = ($('#language').val() in dict) ? $('#language').val() : 'en';
		updateLanguage();
	});

	$('#language').trigger('change');

	$(document).on('input change', '#betnumber', function(){
		var value = parseInt(this.value);
		value = (isNaN(value)) ? minBet : value;
		if (value < minBet) value = minBet;
		if (value > maxBet) value = maxBet;
        $('span#raise-value').text(formatNumber(value));
        $('#betsize').val(value);
    });

    $(document).on('input change', '#betsize', function(e){
        $('span#raise-value').text(formatNumber(this.value));
        $('#betnumber').val(this.value);
    });

    $('#betsize').on('wheel', function(e){
        var delta = e.originalEvent.deltaY;
        var value = parseInt(this.value);
        if (delta > 0) $('#betsize').val(Math.ceil(value / smallBlind - 1) * smallBlind);
        else $('#betsize').val(Math.floor(value / smallBlind + 1) * smallBlind);
        $(this).trigger('change');
    });


    // action buttons
    $('#button-fold').click(function() {
    	socket.emit('sendMove', -1);
    });

    $('#button-call').click(function() {
    	socket.emit('sendMove', toCall + me.bet);
    });

    $('#button-raise').click(function() {
    	socket.emit('sendMove', $('#betsize').val());
    });

    // shortcut buttons
    $('#button-p1').click(function() {
    	$('#betnumber').val(Math.round(prevBet * 2.2)).trigger('change');
    });

    $('#button-p2').click(function() {
    	$('#betnumber').val(Math.round(prevBet * 2.5)).trigger('change');
    });

    $('#button-p3').click(function() {
    	$('#betnumber').val(Math.round(prevBet * 3)).trigger('change');
    });

    $('#button-p4').click(function() {
    	$('#betnumber').val(Math.round(prevBet * 4)).trigger('change');
    });

    $('#button-p5').click(function() {
    	$('#betnumber').val(me.bet + me.stack).trigger('change');
    });

    $('#button-f1').click(function() {
    	$('#betnumber').val(Math.round(pot * 0.3)).trigger('change');
    });

    $('#button-f2').click(function() {
    	$('#betnumber').val(Math.round(pot * 0.5)).trigger('change');
    });

    $('#button-f3').click(function() {
    	$('#betnumber').val(Math.round(pot * 0.7)).trigger('change');
    });

    $('#button-f4').click(function() {
    	$('#betnumber').val(Math.round(pot)).trigger('change');
    });

    $('#button-f5').click(function() {
    	$('#betnumber').val(me.bet + me.stack).trigger('change');
    });

    // ready button
    $('#ready-button').click(function(){
    	socket.emit('playerReady');
    	$(this).hide();
    	$('#waiting').show();
    });

    // chat input
    $('#chat-input').on('keyup', function(e){
        if (e.keyCode == 13) {
            if (sendChatMessage($(this).val()))
                $(this).val('');
        }
    });

    if (Cookies.get('name'))
    	$('#username').val(Cookies.get('name'));

    socket.emit('hello', parseInt(Cookies.get('gameId')), parseInt(Cookies.get('seat')), Cookies.get('name'));

    socket.on('tableStatus', tableStatus);
    socket.on('tableUpdate', tableUpdate);
    socket.on('seatOK', seatOK);
    socket.on('receiveChat', receiveChat);

    socket.on('startGame', startGame);
    socket.on('endGame', endGame);

    socket.on('receiveHand', receiveHand);
    socket.on('receiveFlop', receiveFlop);
    socket.on('receiveTurn', receiveTurn);
    socket.on('receiveRiver', receiveRiver);
    socket.on('requestMove', requestMove);
    socket.on('receiveMove', receiveMove);
    socket.on('initHand', initHand);
    socket.on('moveOK', correctMove);
    socket.on('updateCurrentPlayer', updateCurrentPlayer);
    socket.on('updatePots', updatePots);
    socket.on('showCards', showCards);
    socket.on('showValue', showValue);
    socket.on('handWinner', handWinner);
    socket.on('updateStack', updateStack);
    socket.on('updateDealer', updateDealer);
    socket.on('updateEquities', updateEquities);

    socket.on('updateBlinds', updateBlinds);
    socket.on('updateBlindsUp', updateBlindsUp);

    socket.on('gameState', gameState);
    socket.on('updatePlayerConnection', updatePlayerConnection);
});

function updateLanguage() {
	$('#pot-text').text(dict[lang]['pot']);
	$('#blinds-text').text(dict[lang]['blinds']);
	$('#ready-button').text(dict[lang]['ready']);
	$('#waiting').text(dict[lang]['waiting']);
	$('.player .seat').text(dict[lang]['seat']);
	updateBlindsUp(blindsUpIn);
}

function rotate(seat) {
	return (tableSize + seat - mySeat) % tableSize;
}

function updatePlayerConnection(player, connected) {
	if (connected)
		$('#player-' + rotate(player) + ' .nick').removeClass('disconnected');
	else
		$('#player-' + rotate(player) + ' .nick').addClass('disconnected');
}

function tableStatus(tablePlayers) {
	for (var i = 0; i < tablePlayers.length; i++)
		tableUpdate(i, tablePlayers[i]);
}

function tableUpdate(seat, player) {
	if (seat == mySeat && player == null)
		seated = false;
	if (players[seat] == null && player != null)
		playersInGame++;
	else if (players[seat] != null && player == null)
		playersInGame--;

	var name = (player) ? player.name : '';

	$('#waiting').hide();
	players[seat] = player;
	seat = rotate(seat);
	$('div#player-' + seat + ' .nick').text(name);
	if (!name)
		$('div#player-' + seat + ' .money').text('');

	if (!seated && !started) {
		if (name)
			$('div#player-' + seat + ' .seat').hide();
		else
			$('div#player-' + seat + ' .seat').show();
	}
	else if (playersInGame > 1 && !started) {
		$('#ready-button').show();
	}
	else
		$('#ready-button').hide();
}

function gameState(state, seat, name) {
	console.log('STATE ' +  seat + ' ' + name);
	started = true;
	if (seat !== null && name)
		seatOK(seat, name);
	$('#username-request').hide();
	$('.button.seat').hide();
	$('.game').show();
	me = players[mySeat];

	updateBlinds(state.blindsNow, state.blindsNext);
	updateBlindsUp(state.blindsUp);
	updateDealer(state.dealer);
	phase = state.phase;
	for (var i = 0; i < state.board.length; i++) {
		$('#board-' + i).addClass(cardClass(state.board[i]));
		$('#board-' + i).removeClass('empty');
	}
	updateCurrentPlayer(state.current);
	updatePots({
		pots: state.pots,
		total: state.potTotal,
		clearBets: false
	});
	playersInGame = 0;
	for (var i = 0; i < state.players.length; i++) {
		if (state.players[i]) {
			playersInGame++;
			updateBet(i, state.players[i].bet);
			updateStack(i, state.players[i].stack);
			if (state.players[i].cards)
				showCards(i, state.players[i].cards)
			else if (!state.players[i].folded)
				$('#player-' + rotate(i) + ' .hand').append(createCard()).append(createCard());
		}
	}
}

function updateEquities(equities) {
	for (var i = 0; i < equities.length; i++)
		if (equities[i] !== null) {
			$('div#player-' + rotate(i) + ' .equity').text(equities[i] + '%').show();
		}
}

function updateDealer(player) {
	$('.dealer-button').hide();
	if (player != null)
		$('div#player-' + rotate(player) + ' .dealer-button').show();
}

function updateBlinds(blinds, next) {
	smallBlind = blinds[0];
	bigBlind = blinds[1];
	var txt = formatNumber(blinds[0]) + ' / ' + formatNumber(blinds[1]);
	if (blinds[2] > 0)
		txt += ' ante ' + formatNumber(blinds[2]);

	$('#blinds-now').text(txt);

	if (next) {
		var nxt = formatNumber(next[0]) + ' / ' + formatNumber(next[1]);
		if (next[2] > 0)
			nxt += ' ante ' + formatNumber(next[2]);
		$('#blinds-next').text(nxt);
	}
	else
		$('.blinds-next').hide();
	
}

function updateBlindsUp(deals) {
	blindsUpIn = deals;
	$('#blinds-up').text(dealsText(deals));
}

function seatOK(seat, name) {
	Cookies.set('seat', seat);
	Cookies.set('name', name);
	seated = true;
	mySeat = seat;
	$('.button.seat').hide();
	$('#username-request').hide();
	players[mySeat] = {'name': name};
	playersInGame++;
	tableStatus(players);
}

function receiveHand(cards) {
	$('.equity').hide();
	phase = 0;
	clearBoard();

	if (!cards && seated) {
		return;
	}

	$('.player .hand').empty();

	if (cards && cards.length == 2)
		$('#player-0 .hand').append(createCard(cards[0])).append(createCard(cards[1]));

	players.forEach(function(player, index){
		if (player && (!seated || index != mySeat))
			$('#player-' + rotate(index) + ' .hand').append(createCard()).append(createCard());
	});
}

function cardClass(card) {
	return 'c' + card.suit + '-' + card.rank;
}

function createCard(card) {
    var result = $('<div class="card card-clipped"></div>');
    if (card == null)
        result.addClass('facedown');
    else
    	result.addClass(cardClass(card));
    return result;
}

function sendChatMessage(msg) {
    if (msg.length == 0 || msg.length > 300)
        return false;
    // console.log(msg);
    socket.emit('chatMsg', msg);
    return true;
}

function receiveChat(msg, sender) {
    if (sender) {
        $('#chat-history').append('<p><span class="chat-nick">' + sender + ': </span><span class="chat-msg">' + msg + '</span></p>');
    }
    else {
        $('#chat-history').append('<p><span class="chat-server">' + msg + '</span></p>');
    }
    $('#chat-history').scrollTop($('#chat-history')[0].scrollHeight);
}

function newPhase() {
	phase++;
	$('.player .bet').hide();
	for (var i = 0; i < players.length; i++)
		if (players[i])
			players[i].bet = 0;
}

function receiveFlop(flop) {
	newPhase();
	$('#board-0').addClass(cardClass(flop[0]));
	$('#board-0').removeClass('empty');
	$('#board-1').addClass(cardClass(flop[1]));
	$('#board-1').removeClass('empty');
	$('#board-2').addClass(cardClass(flop[2]));
	$('#board-2').removeClass('empty');
}

function receiveTurn(turn) {
	newPhase();
	$('#board-3').addClass(cardClass(turn));
	$('#board-3').removeClass('empty');
}

function receiveRiver(river) {
	newPhase();
	$('#board-4').addClass(cardClass(river));
	$('#board-4').removeClass('empty');
}

function startGame(stacks, blinds, blindsNext, blindsUp, gameId) {
	if (gameId)
		Cookies.set('gameId', gameId);
	updateBlinds(blinds, blindsNext);
	updateBlindsUp(blindsUp);
	me = players[mySeat];
	for (var i = 0; i < stacks.length; i++)
		if (stacks[i] !== null) {
			updateStack(i, stacks[i]);
			updateBet(i, 0);
		}
	$('#ready-button').hide();
	$('.button.seat').hide();
	$('#username-request').hide();
	$('#waiting').hide();
	$('.game').show();
	started = true;
}

function endGame() {
	clearBoard();
	$('#pot').text(formatNumber(0));
	$('.pots').text('');
	$('.equity').hide();
	$('.game').hide();
	$('.dealer-button').hide();
	$('.player .hand').empty();
	$('.player .money').text('');
	$('.player .bet').hide();
	$('.player .seat').show();
	mySeat = 0;
	seated = false;
	started = false;
	$('#username-request').show();
}

function initHand(player, blind, stack) {
	updateBet(player, blind);
	updateStack(player, stack);
}

function requestMove(lastBet, minRaise) {
	toCall = Math.min(lastBet - me.bet, me.stack);
	minBet = Math.min(lastBet + minRaise, me.bet + me.stack);
	maxBet = me.bet + me.stack;
	prevBet = lastBet;

	if (phase == 0) {
		$('#buttons-preflop').show();
		$('#buttons-postflop').hide();
	}
	else {
		$('#buttons-preflop').hide();
		$('#buttons-postflop').show();
	}

	$('.button.action').show();

	$('#betsize').attr('min', minBet);
	$('#betsize').attr('max', maxBet);
	$('#betnumber').val(minBet).trigger('change');

	$('#button-fold').text(dict[lang]['fold']);

	if (toCall > 0) {
		$('span#call-text').text(dict[lang]['call']);
		$('span#call-value').text(formatNumber(toCall));
	}
	else {
		$('span#call-text').text(dict[lang]['check']);
		$('span#call-value').text('');
	}

	if (lastBet > 0) {
		$('span#raise-text').text(dict[lang]['raiseto']);
	}
	else {
		$('span#raise-text').text(dict[lang]['bet']);
	}

	// fold or call all-in
	if (maxBet <= lastBet || minRaise == 0)
		$('#button-raise').hide();

	$('.bet-window').show();
	updateCurrentPlayer(mySeat);
}

function correctMove(move, stack) {
	$('.bet-window').hide();
	receiveMove(mySeat, move, stack);
}

function receiveMove(player, move, stack) {
	// fold
	if (move == -1)
		$('#player-' + rotate(player) + ' .hand').empty();

	// check, call, bet or raise
	else {
		updatePotTotal(pot + move - players[player].bet);
		updateBet(player, move);
		updateStack(player, stack);
	}
}

function updatePots(obj) {
	var text = '';
	if (obj.clearBets)
		$('.player .bet').hide();

	if (obj.pots.length > 1) {
		text = formatNumber(obj.pots[0]);
		for (var i = 1; i < obj.pots.length; i++)
			text += ' + ' + formatNumber(obj.pots[i]);
	}
	$('.pots').text(text);

	updatePotTotal(obj.total);
}

function updatePotTotal(potsize) {
	pot = potsize;
	$('#pot').text(formatNumber(potsize));
}

function showCards(player, cards) {
	if (cards.length == 2)
		$('#player-' + rotate(player) + ' .hand').empty().append(createCard(cards[0])).append(createCard(cards[1]));
	else if (cards.length == 1)
		$('#player-' + rotate(player) + ' .hand').append(createCard(cards[0])).append(createCard());
}

function updateCurrentPlayer(player) {
	$('.player.current').removeClass('current');
	if (player != null)
		$('#player-' + rotate(player)).addClass('current');
}

function updateStack(player, stack) {
	players[player].stack = stack;
	var stackText = (stack > 0) ? formatNumber(stack) : 'All In';
	$('#player-' + rotate(player) + ' .money').text(stackText);
}

function updateBet(player, bet) {
	players[player].bet = bet;
	if (bet > 0) {
		$('#player-' + rotate(player) + ' .bet').text(formatNumber(bet));
		$('#player-' + rotate(player) + ' .bet').show();
	}
	else
		$('#player-' + rotate(player) + ' .bet').hide();
}

function handWinner(player, chips, stack) {
	receiveChat(players[player].name + ' ' + dict[lang]['winspot'] + ' (' + formatNumber(chips) + ').');
	updateStack(player, stack);
	newPhase();
}

function showValue(player, value) {
	receiveChat(players[player].name + ' ' + dict[lang]['has'] + ' ' + decodeHand(value) + '.');
}

function clearBoard() {
	$('div.board div.card').attr('class', 'card empty');
}

function formatNumber(n) {
	var result = '';
	var zeros = '';
	var modulo = 0;
	do {
		modulo = n % 1000;
		n = Math.floor(n / 1000);
		if (modulo >= 100) zeros = '';
		else if (modulo >= 10) zeros = '0';
		else zeros = '00';
		result = (n > 0) ? ',' + zeros + modulo + result : modulo + result;
	}
	while (n > 0);
	return '$' + result;
}

function decodeHand(value) {
	var short = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
	
	var cards = [];
	for (var i = 26; i >= 0; i--)
		if (value & (1 << i))
			cards.push(i % 13);

	var rank = value >>> 28;

	switch (rank) {
	case 9:
		return dict[lang]['strfsh'] + ': ' + short[cards[0]] + short[cards[0] - 1] + short[cards[0] - 2] + short[cards[0] - 3] + short[(cards[0] + 9) % 13];
		break;

	case 7:
		return dict[lang]['quads'] + ': ' + short[cards[0]] + short[cards[0]] + short[cards[0]] + short[cards[0]] + short[cards[1]];
		break;

	case 6:
		return dict[lang]['house'] + ': ' + short[cards[0]] + short[cards[0]] + short[cards[0]] + short[cards[1]] + short[cards[1]];
		break;

	case 5:
		return dict[lang]['flush'] + ': ' + short[cards[0]] + short[cards[1]] + short[cards[2]] + short[cards[3]] + short[cards[4]];
		break;

	case 4:
		return dict[lang]['straight'] + ': ' + short[cards[0]] + short[cards[0] - 1] + short[cards[0] - 2] + short[cards[0] - 3] + short[(cards[0] + 9) % 13];
		break;

	case 3:
		return dict[lang]['trips'] + ': ' + short[cards[0]] + short[cards[0]] + short[cards[0]] + short[cards[1]] + short[cards[2]];
		break;

	case 2:
		return dict[lang]['2pair'] + ': ' + short[cards[0]] + short[cards[0]] + short[cards[1]] + short[cards[1]] + short[cards[2]];
		break;

	case 1:
		return dict[lang]['pair'] + ': ' + short[cards[0]] + short[cards[0]] + short[cards[1]] + short[cards[2]] + short[cards[3]];
		break;

	case 0:
		return dict[lang]['high'] + ': ' + short[cards[0]] + short[cards[1]] + short[cards[2]] + short[cards[3]] + short[cards[4]];
		break;

	default:
		return false;
	}

}

function dealsText(num) {
	if (lang == 'en') {
		if (num == 1) return 'In 1 deal';
		else return 'In ' + num + ' deals';
	}
	else if (lang == 'pl') {
		if (num == 1) return 'Za 1 rozdanie';
		var n = num % 100;
		var m = n % 10;
		if (m >= 2 && m <= 4 && Math.floor(n / 10) != 1)
			return 'Za ' + num + ' rozdania';
		else
			return 'Za ' + num + ' rozdań';
	}
}

var dict = {
	'en': {
		'pot': 'Pot',
		'bet': 'Bet',
		'fold': 'Fold',
		'check': 'Check',
		'call': 'Call',
		'raiseto': 'Raise to',
		'ready': 'Ready',
		'waiting': 'Waiting for start...',
		'has': 'has',
		'high': 'high card',
		'pair': 'a pair',
		'2pair': 'two pair',
		'trips': 'three of a kind',
		'straight': 'a straight',
		'flush': 'a flush',
		'house': 'a full house',
		'quads': 'four of a kind',
		'strfsh': 'a straight flush',
		'winspot': 'wins pot',
		'blinds': 'Blinds',
		'seat': 'Sit here'
	},
	'pl': {
		'pot': 'Pula',
		'bet': 'Stawiam',
		'fold': 'Pasuję',
		'check': 'Czekam',
		'call': 'Sprawdzam',
		'raiseto': 'Przebijam do',
		'ready': 'Start',
		'waiting': 'Oczekiwanie na start...',
		'has': 'ma',
		'high': 'wysoką kartę',
		'pair': 'parę',
		'2pair': 'dwie pary',
		'trips': 'trójkę',
		'straight': 'strita',
		'flush': 'kolor',
		'house': 'fula',
		'quads': 'karetę',
		'strfsh': 'pokera',
		'winspot': 'wygrywa pulę',
		'blinds': 'Ciemne',
		'seat': 'Usiądź tutaj'
	}
};
