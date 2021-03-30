var MenuItem = require('./menuitem');
var MenuType = MenuItem.MenuType;
var _ = require('underscore');
var colors = require('colors/safe');

var NodeMenu = function() {
	var self = this;

	self.CLEAR_CODE = "\u001b[2J\u001b[0;0H";

	self.consoleOutput = console.log;
	self.menuItems = [];
	self.waitToContinue = false;
	self.itemNo = 0;
	self.printDefaultHeader = true;
	self.printDefaultPrompt = true;

};

NodeMenu.prototype.enableDefaultHeader = function() {
	var self = this;
	self.printDefaultHeader = true;
	return self;
};

NodeMenu.prototype.disableDefaultHeader = function() {
	var self = this;
	self.printDefaultHeader = false;
	return self;
};

NodeMenu.prototype.customHeader = function(customHeaderFunc) {
	var self = this;
	self.printDefaultHeader = false;
	self.customHeaderFunc = customHeaderFunc;
	return self;
};

NodeMenu.prototype.enableDefaultPrompt = function() {
	var self = this;
	self.printDefaultPrompt = true;
	return self;
};

NodeMenu.prototype.disableDefaultPrompt = function() {
	var self = this;
	self.printDefaultPrompt = false;
	return self;
};

NodeMenu.prototype.customPrompt = function(customPromptFunc) {
	var self = this;
	self.printDefaultPrompt = false;
	self.customPromptFunc = customPromptFunc;
	return self;
};

NodeMenu.prototype.resetMenu = function() {

	this.waitToContinue = false;
	process.stdin.removeAllListeners('data');

	return this;
};

NodeMenu.prototype.continueCallback = function(continueCallback) {
	var self = this;
	self.continueCallback = continueCallback && _.isFunction(continueCallback) ? continueCallback : undefined;
	return self;
};

NodeMenu.prototype.addItem = function(title, handler, owner, args) {
	var self = this;
	self.menuItems.push(new MenuItem(MenuType.ACTION, ++self.itemNo, title, handler, owner, args));
	return self;
};

NodeMenu.prototype.addDelimiter = function(delimiter, cnt, title) {
	var self = this;
	var menuItem = new MenuItem(MenuType.DELIMITER);
	if (delimiter) {
		menuItem.setDelimiter(delimiter, cnt, title);
	}

	self.menuItems.push(menuItem);
	return self;
};

NodeMenu.prototype.showMenu = function(msg) {

	this._printMenu(msg);
}

NodeMenu.prototype.stop = function() {

	process.stdin.end();

	this.waitToContinue = false;
	process.stdin.removeAllListeners('data');

	console.log(this.CLEAR_CODE);

}

NodeMenu.prototype.start = function(msg) {
	// this.resetMenu();
	var self = this;

	self._printMenu(msg);

	process.stdin.resume();
	process.stdin.setEncoding('utf8');

	process.stdin.on('data', function(text) {
		var args = self._parseInput(text);
		var item = null;
		if (args && ('itemNo' in args)) {
			for (var i = 0; i < self.menuItems.length; ++i) {
				if (self.menuItems[i].number == args.itemNo) {
					item = self.menuItems[i];
					break;
				}
			}
		}

		if (self.waitToContinue) {
			if (self.continueCallback) {
				self.continueCallback();
			}

			// self._printMenu();
			if (self._needToPrintMenu) {
				self._printMenu();
				self._needToPrintMenu = false;
			}

			self.waitToContinue = false;
			return;
		}

		if (text === '') {
			self._needToPrintMenu = true;
		} else if (!item) {
			process.stdout.write('\033[1A');
			process.stdout.write('\033[K');
			process.stdout.write("nubo# command not found, press Enter to continue...");
			process.stdin.emit('data', '');
			self.waitToContinue = true;
		} else {
			var valid = item.validate(args.argv);
			if (!valid.lengthMatch) {
				self.consoleOutput('Invalid number of input parameters');
			} else if (!valid.typesMatch) {
				self.consoleOutput('Invalid types of input parameters');
			} else {
				item.handler.apply(item.owner, args.argv);
			}
		}
	});

};

NodeMenu.prototype._parseInput = function(text) {
	var self = this;

	if (text === '') {
		return {};
	}

	var patt = /(".*?")|([^\s]{1,})/g;
	var match = text.match(patt);
	var res = null;

	if (match && match.length > 0) {
		if (isNaN(match[0])) {
			self.consoleOutput("Invalid item number");
			return res;
		}

		res = {};
		res.itemNo = parseInt(match[0]);
		res.argv = match.slice(1);
		for (var i = 0; i < res.argv.length; ++i) {
			res.argv[i] = res.argv[i].replace(/"/g, '');
			if (res.argv[i].trim !== '') {
				var num = Number(res.argv[i]);
				if (!isNaN(num)) {
					res.argv[i] = num;
				} else if (res.argv[i] === 'true' || res.argv[i] === 'false') {
					res.argv[i] = (res.argv[i] === 'true');
				}
			}
		}
	}

	return res;
};

NodeMenu.prototype._printHeader = function() {
	var self = this;
	return;
	if (self.printDefaultHeader) {
		process.stdout.write('                     \n' +
			'               _   _ _    _ ____   ____           \n' +
			'              |\\ | | |  | |  _ \ / __ \          \n' +
			'              | \\| | |  | | |_) | |  | |         \n' +
			'              | . ` | |  | |  _ <| |  | |         \n' +
			'              | |\\  | |__| | |_) | |__| |         \n' +
			'              |_| \\_|\____/|____/ \____/          \n' +
			'                                                  \n' +
			'                                                  \n');
	} else if (_.isFunction(self.customHeaderFunc)) {
		self.customHeaderFunc();
	}
};

NodeMenu.prototype._printPrompt = function() {
	var self = this;
	return;

	if (self.printDefaultPrompt) {
		self.consoleOutput('\n');
	} else if (_.isFunction(self.customPromptFunc)) {
		self.customPromptFunc();
	}
};

NodeMenu.prototype._printMenu = function(msg) {
	var self = this;

	console.log(self.CLEAR_CODE);

	self._printHeader();
	for (var i = 0; i < self.menuItems.length; ++i) {
		var menuItem = self.menuItems[i];
		printableMenu = menuItem.getPrintableString();
		if (menuItem.menuType === MenuType.ACTION) {
			self.consoleOutput(menuItem.number + ". " + printableMenu);
		} else if (menuItem.menuType === MenuType.DELIMITER) {
			self.consoleOutput(printableMenu);
		}
	}

	self._printPrompt();

	if (msg) {
		process.stdout.write("\n   " + colors.red(msg));
	}

	process.stdout.write("\nnubo# ");
};

module.exports = NodeMenu;