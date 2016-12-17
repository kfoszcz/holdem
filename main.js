var Combination = require('./Combination.js');
var Card = require('./Card.js');
var Deck = require('./Deck.js');
var Hand = require('./Hand.js');

function printCards(cards) {
	if (!cards || cards.length == 0)
		return;
	var result = '[';
	result += cards[0].toString();

	for (var i = 1; i < cards.length; i++)
		result += ' ' + cards[i].toString();

	result += ']';
	return result;
}

var deck = new Deck(1);
deck.shuffle();

var A = [deck.drawCard(new Card(3, 3)), deck.drawCard(new Card(2, 2))];
var B = [deck.drawCard(new Card(3, 13)), deck.drawCard(new Card(2, 14))];

console.log(printCards(A) + ' vs ' + printCards(B));

var iter = new Combination(deck.marker, deck.deck.length, 5);

var handA = new Hand();
var handB = new Hand();

var valueA = 0;
var valueB = 0;

var wins = 0;
var looses = 0;
var splits = 0;
var all = 0;
var i;

do {
	handA.clear();
	handA.addCard(A[0].code);
	handA.addCard(A[1].code);

	handB.clear();
	handB.addCard(B[0].code);
	handB.addCard(B[1].code);

	for (i = 0; i < 5; i++) {
		handA.addCard(deck.deck[iter.index[i]].code);
		handB.addCard(deck.deck[iter.index[i]].code);
	}

	valueA = handA.eval();
	valueB = handB.eval();

	if (valueA > valueB) wins++;
	else if (valueA < valueB) looses++;
	else splits++;
	
} while (iter.next());

all = wins + looses + splits;

console.log('  Win: ' + Math.round(wins / all * 1000) / 10);
console.log('Loose: ' + Math.round(looses / all * 1000) / 10);
console.log('Split: ' + Math.round(splits / all * 1000) / 10);