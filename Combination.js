/*
	Combination class
	Iterate through all combinations (n choose k) of array
*/

function Combination(start, end, amount) {
	this.start = start;
	this.end = end;
	this.stop = start + amount - 1;
	this.tmp = 0;
	this.index = [];
	for (var i = this.stop; i >= this.start; i--)
		this.index.push(i);
	this.index.push(this.start - 2);
}

Combination.prototype.next = function() {
	while (++this.index[this.tmp] >= this.end - this.tmp)
		this.tmp++;
	while (this.tmp > 0) {
		this.index[this.tmp - 1] = this.index[this.tmp] + 1;
		this.tmp--;
	}
	return this.index[0] != this.stop;
};

module.exports = Combination;
