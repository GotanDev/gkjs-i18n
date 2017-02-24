/** 
 * Gestion des langues dans l'application. 
 * 
 * Il suffit d'appeler la méthode __ pour traduire un message
 * 
 * @version 1.0
 * @author Damien Cuvillier
 * @copyright All right Reserved to Gotan
 */


/** Traduit un message dans la langue locale. 
 * @param code code du message à traduire
 * @param parameters tableau des parametres
*/
var __ = function(code, parameters) {
	return gkjs.i18n.getMessage(code, parameters);
}

if (gkjs == null) {
	var gkjs = {};
}


gkjs.i18n = {
	_settings: {
		/* Répertoire où se trouve les fichiers de langue. */
		basePath : "lang/", 
		/** Langue par défaut utilisé si le fichier de langue demandé n'est pas trouvé. */
		defaultLanguage : "fr"
	},
	_data: {},
	getLang : function() {
		if (window.localStorage == null || window.localStorage.lang == null) {
			if (navigator.language == null) {
				return this._settings.defaultLanguage;
			} else {
				return navigator.language.indexOf("-") == -1 ? navigator.language : navigator.language.substr(0,navigator.language.indexOf("-"));
			}
		} else {
			return window.localStorage.lang;
		}
	}, 
	/** Récupère un ,message à partir de son code. 
	 *   - Si le message n'est pas trouvé, alors on essaye de récupérer dans la langue par défaut
	 *   - Si le message n'est pas disponible, alors on renvoie son code
	 *
	 * Tous les messages manquants sont loggués en console
	 * @param messageCode du message
	 * @param parameters Tableau ordonné des paramètres
	 * @param lang Langue à récupérer. Si non précisé, alors on prend la langue définie dans l'application
	 */
	getMessage : function(messageCode, parameters, lang) {
		if (lang == null) {
			lang = this.getLang();
		}
		if (this._data[lang] == null) {
			this.loadLanguage(lang);
			return;
		} 

		messageCode = messageCode.trim();
		if (this._data[lang][messageCode] != null) {
			return this.parseVars(this._data[lang][messageCode], parameters);
		} 
		logger.warn("[gkjs.i18n] Message " + messageCode + " not found in " + lang + " lang");
		if (lang != this._settings.defaultLanguage) {
			return this.getMessage(messageCode.trim(), parameters, this._settings.defaultLanguage)
		} else {
			return messageCode;
		}
	}, 

	parseVars: function(message, parameters){
		if (isArray(parameters)) {
			for (var i = 1 ; i <= parameters.length ; i++) {
				var expression = new RegExp("%%" + i, "g")
				message = message.replace(expression, parameters[i - 1]);
			}
		}
		return message;
	}, 
	reset : function(){
		this._data = {};
		for (var key in sessionStorage) {
			if (key.startsWith("LOCALE_")) {
				delete sessionStorage[key];
			}
		}
		logger.debug("i18n data has to be reloaded");
		
	},
	/** Charge le fichier de langue, 
	 * et à défaut la langue par défaut.
	 */
	loadLanguage : function(languageCode, callback) {
		if (gkjs.i18n._data[languageCode] != null) {
			// Already loaded
			return;
		}

		if (sessionStorage["LOCALE_" + languageCode] != null) {
			gkjs.i18n._data[languageCode] = jQuery.parseJSON(sessionStorage["LOCALE_" + languageCode]);
		}

		if (gkjs.i18n._data[languageCode] == null) {
			// Will throws a JS Warning
			// Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.
			jQuery.ajax({
				type: "GET", 
				cache: true,
				async: false,
				dataType: "text",
				url: this._settings.basePath + 'Messages.' + languageCode + '.json', 
				success: function(data) {
					sessionStorage["LOCALE_" + languageCode] = data;
					gkjs.i18n._data[languageCode] = jQuery.parseJSON(data);
					if (typeof callback == "function") {
						callback();
					} 
				}, error: function(data) {
					gkjs.i18n._data[languageCode] = {};
					if (languageCode == gkjs.i18n._settings.defaultLanguage) {
						var message = "[gkjs.i18n] Unable to load default language " + gkjs.i18n._settings.defaultLanguage;
						logger.error(message);
						logger.info("Status:" + data.status +  " / URL: " + this.url);
						throw message;
					} else {
						logger.warn("[gkjs.i18n] Unable to load language " + languageCode);
						if (gkjs.i18n._data[gkjs.i18n._settings.defaultLanguage] == null) {
							gkjs.i18n.loadLanguage(gkjs.i18n._settings.defaultLanguage);
						}
					}
					
				}
			});
		}
	
	}, 
	/** Change de langue d'affichage. */
	changeLanguage : function(languageCode) {
		window.localStorage.lang = languageCode;
		this.loadLanguage(languageCode);
	}, 
	/** Charge toutes les zones à traduire et change son contenu */
	run : function(){
		if (this._data == null){
			return;
		}
		if (this._data[this.getLang()] == null) {
			this.loadLanguage(this.getLang(), gkjs.i18n.run);
		} else {
			jQuery("[i18n]").each(function(){
				var ttt = jQuery(this).text();
				if (ttt.trim() != "")  jQuery(this).text(__(ttt));
				jQuery(this).removeAttr("i18n");
				// Replace in all textual attributes
				var textAttributes = [ "placeholder", "title", "alt", "data-original-title"];
				for (attId in textAttributes) {
					var attName = textAttributes[attId];
					if (jQuery(this).attr(attName) != null && jQuery(this).attr(attName).trim() != "") {
						jQuery(this).attr(attName, __(jQuery(this).attr(attName)));
					}
				}
			});
		}
	}, 
	init: function(){
		gkjs.i18n.run();
	}
};
jQuery(document).ready(function(){
	gkjs.i18n.init();
});



// Angular Feature
if (typeof angular != "undefined") {
	angular.module('gkjs', []).filter('i18n', function() {
	  return function(input) {
	    return __(input);
	  };
	});
}
