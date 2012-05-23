//var BASEURL = 'http://localhost:5000';
var BASEURL = 'http://surveyapidev.herokuapp.com';
//var surveyid = 'b53eed70-9337-11e1-9bf5-39dee61cc65b';
var surveyid = '23206450-a0ac-11e1-ae6a-a17fba15c6fd';


function htmlTemplate(el, plate, data) {
  el.html(_.template(plate.html(), data));
}

function friendlyDate(str) {
  if (!str) {
    return 'unknown';
  }
  var d = new Date(str);
  var now = new Date();
  if (d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()) {
    return 'Today at ' + d.toLocaleTimeString();
  }
  return d.toLocaleDateString();
}

function compareCreatedNewToOld(a, b) {
  if (a.created === undefined) {
    return 1;
  }
  if (a.created > b.created) {
    return -1;
  }
  if (a.created < b.created) {
    return 1;
  }
  return 0;
}
