
var denodify = function (fn) {
	return function () {
		var args = Array.prototype.slice.call(arguments);
		return new Promise(function (fulfill, reject) {
			fn.apply(null, args.concat([fulfill]));
		});
	};
};

var hostToDomain = function (host) {
	var a = host.split('.');
	if (a.length > 2)
		a = a.slice(a.length-2);
	return a.join('.');
};

var cookieDomainToUrl = function (domain) {
	return 'http://'+domain.replace(/^\./, '');
};

var getAllCookiesByDomain = function (domain) {
	return denodify(chrome.cookies.getAll)({domain: domain});
};

var removeAllCookiesByDomain  = function (domain) {
	return getAllCookiesByDomain(domain).then(function (cookies) {
		console.log('remove', domain, cookies);
		return removeAllCookies(cookies);
	});
};

var removeAllCookies = function (cookies) {
	return Promise.all(cookies.map(function (c) {
		return denodify(chrome.cookies.remove)({
			url: cookieDomainToUrl(c.domain),
			name: c.name,
			storeId: c.storeId,
		});
	}));
};

var setAllCookies = function (cookies) {
	return Promise.all(cookies.map(function (c) {
		var set = {
			url: cookieDomainToUrl(c.domain),
			name: c.name, value: c.value,
			domain: c.domain, path: c.path,
			secure: c.secure, httpOnly: c.httpOnly,
			expirationDate: c.expirationDate, storeId: c.storeId,
		};
		return denodify(chrome.cookies.set)(set);
	}));
};

var removeAndSetCookies = function (domain, cookies) {
	return removeAllCookiesByDomain(domain).then(function () {
		return setAllCookies(cookies);
	});
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
			return removeAndSetCookies(domain, data.profiles[data.currentProfileId].cookies);
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
			return removeAndSetCookies(domain, newProfile.cookies || []);
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

