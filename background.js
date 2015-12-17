
var denodify = function (fn) {
	return function () {
		var args = Array.prototype.slice.call(arguments);
		return new Promise(function (fulfill, reject) {
			fn.apply(null, args.concat([fulfill]));
		});
	};
};

var sendMessageToCurrentTab = function (message) {
	return new Promise(function (fulfill, reject) {
		chrome.tabs.query({'active': true}, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, message, {}, fulfill);
		});
	});
};

var resetLocalStorageByDomain = function (domain, content) {
	return sendMessageToCurrentTab({
		op: 'resetLocalStorageByDomain',
		params: {domain: domain, content: content},
	});
};

var getLocalStorageByDomain = function (domain) {
	return sendMessageToCurrentTab({
		op: 'getLocalStorageByDomain',
		params: {domain: domain},
	});
};

var hostToDomain = function (host) {
	var a = host.split('.');
	if (a.length > 2)
		a = a.slice(a.length-2);
	return a.join('.');
};

var cookieUrl = function (c) {
	return (c.secure?'https':'http')+'://'+c.domain.replace(/^\./, '');
};

// cookies={cookies,localStorage}

var getAllCookiesByDomain = function (domain) {
	var res = {}
	return denodify(chrome.cookies.getAll)({domain: domain}).then(function (cookies) {
		res.cookies = cookies;
		return getLocalStorageByDomain(domain);
	}).then(function (content) {
		res.localStorage = content;
		return res;
	});
};

var removeAllCookiesByDomain  = function (domain) {
	return getAllCookiesByDomain(domain).then(function (cookies) {
		return Promise.all([
			removeAllChromeCookies(cookies.cookies),
			resetLocalStorageByDomain(domain, {}),
		]);
	});
};

var resetAllCookiesByDomain = function (domain, cookies) {
	return removeAllCookiesByDomain(domain).then(function () {
		return Promise.all([
			setAllChromeCookies(cookies.cookies),
			resetLocalStorageByDomain(domain, cookies.localStorage),
		])
	});
};

var removeAllChromeCookies = function (cookies) {
	return Promise.all(cookies.map(function (c) {
		return denodify(chrome.cookies.remove)({
			url: cookieUrl(c),
			name: c.name,
			storeId: c.storeId,
		});
	}));
};

var setAllChromeCookies = function (cookies) {
	return Promise.all(cookies.map(function (c) {
		var set = {
			url: cookieUrl(c),
			name: c.name, value: c.value,
			domain: c.domain, path: c.path,
			secure: c.secure, httpOnly: c.httpOnly,
			expirationDate: c.expirationDate, storeId: c.storeId,
		};
		return denodify(chrome.cookies.set)(set);
	}));
};

var storageGet = function (k, v) {
	var storage = chrome.storage.local;
	return denodify(storage.get.bind(storage))(k).then(function (res) {
		return res[k] || v;
	});
};

var storageSet = function (k, v) {
	var storage = chrome.storage.local;
	var p = {};
	p[k] = v;
	return denodify(storage.set.bind(storage))(p);
};

var defaultDomainData = function () {
	return {profiles: {1: {title: '默认'}}, currentProfileId: 1};
};

var api = {};

api.deleteCurrentProfile = function (params) {
	var domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			return;
		if (Object.keys(data.profiles).length <= 1)
			return;
		delete data.profiles[data.currentProfileId];
		data.currentProfileId = Object.keys(data.profiles)[0];
		return storageSet(domain, data).then(function () {
			return resetAllCookiesByDomain(domain, data.profiles[data.currentProfileId].cookies);
		});
	});
};

api.newProfile = function (params) {
	var domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			data = defaultDomainData();

		var oldProfile = data.profiles[data.currentProfileId];
		return getAllCookiesByDomain(domain).then(function (cookies) {
			oldProfile.cookies = cookies;

			var newProfile = {title: '马甲'+Object.keys(data.profiles).length};
			var newProfileId = Date.now();
			data.profiles[newProfileId] = newProfile;
			data.currentProfileId = newProfileId;
		}).then(function () {
			return removeAllCookiesByDomain(domain);
		}).then(function () {
			return storageSet(domain, data);
		});
	});
};

api.updateProfile = function (params) {
	var domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			return;
		var id = params.id || data.currentProfileId;
		var profile = data.profiles[id];
		if (profile == null)
			return;
		for (var k in params.$set || {}) {
			var v = params.$set[k];
			profile[k] = v;
		}

		return storageSet(domain, data);
	});
};

api.selectProfile = function (params) {
	var domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			return;
		if (params.id == data.currentProfileId)
			return;

		var oldProfile = data.profiles[data.currentProfileId];
		var newProfile = data.profiles[params.id];
		if (oldProfile == null || newProfile == null)
			return;

		return getAllCookiesByDomain(domain).then(function (cookies) {
			oldProfile.cookies = cookies;
			data.currentProfileId = params.id;
			return storageSet(domain, data);
		}).then(function () {
			return resetAllCookiesByDomain(domain, newProfile.cookies);
		});
	});
};

api.getProfiles = function (params) {
	var domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			return defaultDomainData();
		return data;
	});
};

api.updateUserInfo = function (params) {
	var domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			data = defaultDomainData();
		var profile = data.profiles[data.currentProfileId];
		profile.title = params.username;
		return storageSet(domain, data);
	});
};

chrome.runtime.onMessage.addListener(function (msg, sender, cb) {
	var fulfill = function (res) {
		console.log(msg, res);
		cb(res);
	};

	var func = api[msg.op];
	if (func)
		func(msg.params).then(fulfill);

	return true;
});

