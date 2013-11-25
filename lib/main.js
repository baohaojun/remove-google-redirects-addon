const { Cc, Ci, Cr } = require("chrome");
const GOOGLE_REGEXP = /http(s)?:\/\/((www|encrypted|news|images)\.)?google\.(.*?)\/url\?/;
const GOOGLE_IMGRES_REGEXP = /http(s)?:\/\/(.*?\.)?google\.(.*?)\/imgres\?/;

var contextmenu = require("sdk/context-menu");
var events = require("sdk/system/events");
var querystring = require("sdk/querystring");
var tabs = require("tabs");
var data = require("self").data;
var utils = require("sdk/window/utils");


function listener(event) {
  var channel = event.subject.QueryInterface(Ci.nsIHttpChannel);
  var url = event.subject.URI.spec;

  var isSearchResult = GOOGLE_REGEXP.test(url);
  var isImageSearchResult = GOOGLE_IMGRES_REGEXP.test(url);

  if (isSearchResult || isImageSearchResult) {
    // abort current request
    // Ref: https://developer.mozilla.org/en-US/docs/XUL/School_tutorial/Intercepting_Page_Loads
    channel.cancel(Cr.NS_BINDING_ABORTED);

    // get the query string part of the url
    var position = url.indexOf("?") + 1;
    var qs = url.slice(position);
    parsed_qs = querystring.parse(qs);
 
    // and then make a new request

    /* the following does not work for https urls, dont know why
    var navigation = channel.notificationCallbacks.getInterface(Ci.nsIWebNavigation);
    navigation.loadURI(parsed_qs.url, Ci.nsIWebNavigation.LOAD_FLAGS_IS_LINK, null, null, null);
    * so I have to do it this way: */

    // get the current gbrowser (since the user may have several windows
    // and tabs) and load the fixed URI
    var gBrowser = utils.getMostRecentBrowserWindow().gBrowser;
    var domWin = channel.notificationCallbacks.getInterface(Ci.nsIDOMWindow);
    var browser = gBrowser.getBrowserForDocument(domWin.top.document);

    if (isSearchResult) {
      if (parsed_qs.url && parsed_qs.url.match(/:\/\//)) {
        browser.loadURI(parsed_qs.url);
        return;
      }

      if (parsed_qs.q) {
        // On custom embedded searches Google uses q params instead of url
        // See for instance: http://www.google.com/cse/publicurl?cx=005900015654567331363:65whwnpnkim
        browser.loadURI(parsed_qs.q);
        return;
      }
      
      if (parsed_qs.url) {
        browser.loadURI(parsed_qs.url);
        return;
      }
    } else {
      // isImageSearchResult is true
      if (parsed_qs.imgurl) {
        browser.loadURI(parsed_qs.imgurl);
        return;
      }
    }

  };
};
 

exports.main = function() {
  events.on("http-on-modify-request", listener);

  contextmenu.Item({
    label: "A Mozilla Image",
    context: contextmenu.SelectorContext("a"),
    contentScriptFile: data.url("menu-script.js")
  });
};
 
 
exports.onUnload = function (reason) {
  events.off("http-on-modify-request", listener);
};

