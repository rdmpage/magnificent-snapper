function loadXMLDoc(filename) {
	if (window.ActiveXObject) {
		 xhttp = new ActiveXObject("Msxml2.XMLHTTP");
	} else {
		 xhttp = new XMLHttpRequest();
	}
	xhttp.open("GET", filename, false);
	xhttp.send("");
	return xhttp.responseXML;
 }
	
function show(jats, id) {
	parser = new DOMParser();
	xml = parser.parseFromString(jats,"text/xml");

	xsl = loadXMLDoc("/xsl/no-full-text.xsl");
	// code for IE
	if (window.ActiveXObject || xhttp.responseType == "msxml-document") {
		ex = xml.transformNode(xsl);
	  	document.getElementById(id).innerHTML = ex;
	}
	// code for Chrome, Firefox, Opera, etc.
	else if (document.implementation && document.implementation.createDocument) {
		xsltProcessor = new XSLTProcessor();
	  	xsltProcessor.importStylesheet(xsl);
	  	resultDocument = xsltProcessor.transformToFragment(xml, document);
	  	document.getElementById(id).appendChild(resultDocument);
	}
}					
						