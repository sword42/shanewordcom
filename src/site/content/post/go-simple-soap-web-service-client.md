+++
date = "2016-05-25T15:02:19-07:00"
draft = false
title = "Go Simple Soap Web Service Client"
aliases = ["/posts/go-simple-soap-web-service-client.html"]
author = "Shane"
description = "Go Simple Soap Web Service Client"
headerimage = "/img/photo-1463412855783-af97e375664b-lg.jpg"
headertitle = "Go Simple Soap Web Service Client"
darkenheader = true
+++

I was doing some work with Go calling one of our internal Soap Web Services for a project, and I noticed that Go doesn't make it very easy to get it done. There's tons of language support and examples for JSON, which makes sense, since that's what people are using now.  If you need to call a Service built in the past though, there's a good chance it'll be Soap.


All code for this example is available on github.com at [https://github.com/sword42/gosoapwebserviceexample](https://github.com/sword42/gosoapwebserviceexample).

## Hasn't this already been covered?

So how would you go about doing the call?  I looked over a few examples, including the very good [Tao of Mac post](http://taoofmac.com/space/blog/2014/05/11/1121) and [Giant Machines post](http://giantmachines.tumblr.com/post/49002286919/dealing-with-soap-xml-requests-in-golang) and they clearly covered the ideas regarding creating Soap requests and executing them.  Responses weren't covered though, and they end up being a bit tricky.

Before we get to responses though, how would we do our requests? Although the Tao post shows how to create custom Request structs and get them to marshall properly, there seemed to be very little gain from doing that. If you had a large number of possible request structures, where the combinations couldn't be easily covered in an if or switch, then perhaps. Or if you had complex object structures that need to be sent via your requests (more than ~15 fields) for Update or Create requests, maybe. Otherwise, you're better off just using the request text as a template with a few replaceable fields. The Giant Machines post goes into more detail on this. Golang Template replacement allows a context object to be passed in for the populated fields, so you'll need to make sure you have your request template, and a context struct for the dynamic content.

## Lets see an example

For my example, I'm going to use the Soap Weather service provided by [http://www.cdyne.com/](http://www.cdyne.com/) at: [http://wsf.cdyne.com/WeatherWS/Weather.asmx?op=GetCityWeatherByZIP](http://wsf.cdyne.com/WeatherWS/Weather.asmx?op=GetCityWeatherByZIP).  This service enables the requestor to submit a service request to retrieve a weather profile for a given postal code. It does not have any authentication required, and supports many different web service methods, but we're going to use the Soap 1.1 endpoint. We need a context struct to populate the postal code when we "render" the template. We'll create an object like:
```go
	type QueryData struct {
		PostalCode string
	}
```
That should hold our query data, and then we can define a template const to hold the rest of the Soap request content like:
```go
	const getTemplate = `&lt;?xml version="1.0" encoding="utf-8"?&gt;
	&lt;soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"&gt;
	  &lt;soap:Body&gt;
	    &lt;GetCityWeatherByZIP xmlns="http://ws.cdyne.com/WeatherWS/"&gt;
	      &lt;ZIP&gt;\{{.PostalCode}}&lt;/ZIP&gt;
	    &lt;/GetCityWeatherByZIP&gt;
	  &lt;/soap:Body&gt;
	&lt;/soap:Envelope&gt;`
```
Now that we have our two parts, we can setup a func to create the request content given the Postal Code:
```go
func generateRequestContent(postalCode string) string {
	type QueryData struct {
		PostalCode string
	}
	const getTemplate = `&lt;?xml version="1.0" encoding="utf-8"?&gt;
	&lt;soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"&gt;
	  &lt;soap:Body&gt;
	    &lt;GetCityWeatherByZIP xmlns="http://ws.cdyne.com/WeatherWS/"&gt;
	      &lt;ZIP&gt;\{{.PostalCode}}&lt;/ZIP&gt;
	    &lt;/GetCityWeatherByZIP&gt;
	  &lt;/soap:Body&gt;
	&lt;/soap:Envelope&gt;`
	querydata := QueryData{PostalCode:postalCode}
	tmpl, err := template.New("getCityWeatherByZIPTemplate").Parse(getTemplate)
	if err != nil {
		panic(err)
	}
	var doc bytes.Buffer
	err = tmpl.Execute(&doc, querydata)
	if err != nil {
		panic(err)
	}
	return doc.String()
}
```

## Full Request

Now we have our request content, we just need to open an http request and pass the request content to the server, and get the response. We can do that using the Go http.Client, which will give us access to the HTTP headers so we can set the Soap Action HTTP Header on the request, as well as content type and accept headers. Before we setup a func to process the request though, we'll also need a struct to hold the response information that we get back.  Something like:

```go
type WeatherInfo struct {
	State string
	City string
	WeatherStationCity string
	WeatherID int
	Description string
	Temperature string
	RelativeHumidity string
	Wind string
	Pressure string
	Visibility string
	WindChill string
	Remarks string
}
```
Now we should be able to create a func to let us setup and make the request. We'll add a call to convert the Response at the end so we'll have someplace to work with the results.

```go
func queryWeatherForZip(postalCode string) (*WeatherInfo, error) {
	url := "http://wsf.cdyne.com/WeatherWS/Weather.asmx"
	client := &http.Client{}
	sRequestContent := generateRequestContent(postalCode)
	requestContent := []byte(sRequestContent)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(requestContent))
	if err != nil {
		return nil,err
	}

	req.Header.Add("SOAPAction", `"http://ws.cdyne.com/WeatherWS/GetCityWeatherByZIP"`)
	req.Header.Add("Content-Type", "text/xml; charset=utf-8")
	req.Header.Add("Accept", "text/xml")
	resp, err := client.Do(req)
	if err != nil {
		return nil,err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, errors.New("Error Respose " + resp.Status)
	}
	contents, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	m, _ := mxj.NewMapXml(contents, true)
	return convertResults(&m)
}
```
The structure of this func is pretty straightforward.  We define the url and client, generate our request content (as a byte slice), create our request, and set the headers on it. Once all that's setup, we can execute the request and check to make sure we done have any failures. At the bottom, you'll see the func I mentioned before to convert the response, along with a new call to create a MapXML out of the contents first.  Before we go into too much detail, we should probably talk about the 2 ideologies regarding handling collections of data in typed languages like Go.

## Getting Philosophical

Typed languages provide some structure for the developers, in exchange for some constraints. Some developers welcome the structure and don't mind the constraints, others fight them tooth and nail. In the case of Go, Typing provides compile-time checking of variables, and tooling support.  Both are generally productivity enhancements for developers. Developers that want to be unconstrained in Go can store stuff in more generic data structures (slices, maps), usually with interface{}.  Usually this leads to lots of calls through the reflect package, but depending on the area being developed, it might be worth the risk to speed up the work.  Like many things, its a trade-off, but hopefully one the developer can make an informed decision about.

How does this apply to Go Soap calls? When making a remote call outside the application's space, you are implicitly entering into weaker typing territory. There might be contracts or constraints that help keep things above board, but you will never have the complier's guarantee that everything is what it should be. So you've got to figure out what level of typing works for your situation. If you have the time to do it right, I highly suggest you get your data into a typed Go Struct as soon as you can, program-wise. One less thing to worry about. What would that involve for your Soap calls? You should define a Soap Struct Hierarchy that includes the Soap Envelope, Soap Body, and Response Body objects, with known types all the way down. If your schema is straightforward, you could use Go's xml Unmarshall support to get the data into your structs. There are even some packages that will help you auto-generate structs based on a WSDL or Response object. Even if you then have to copy the data into a separate struct structure your program uses, you'll be able to centralize the handling for things like type transformations, missing data, or other actions. Chances are your Soap contract isn't going to be changing much anyways, so this is onetime work per service, and then you shouldn't have to worry about it again.

## The right tools for the job

If you don't have the time, ability, or desire to do that though, there are some tools to help you simply make a call and get a result. You might need to do a bit more massaging of the data in your service interface func, but its still possible to be successful in many cases. The two tools we'll be using to get the response data into a more manageable format are [Charles Banning's MXJ](https://github.com/clbanning/mxj) and [Mitchell Hashimoto/Hashicorp's Mapstructure](https://github.com/mitchellh/mapstructure).  MXJ handles the work of taking the xml content as a raw byte slice and putting it into a map[string]interface{} structure, with nested map[string]interface{} objects for nested content.  That means lots of reflect conversion to pull the values out. Easy with a small structure, nasty with a large one. Mapstructure takes a Map structure in Go, and converts it into a concrete struct, attempting to do type conversion if need be.  The struct can have tags to help mapstructure make the right choices, and you can also add decode hooks into your request so you can have more fine grained control over the conversion process at key points.


With these two tools, we'll take our response content, create an XML Map from it, then have Mapstructure convert that map into our previously defined WeatherInfo object. One thing we have to keep in mind though is the possibility of request/response transaction fields that are part of the Soap Response. Many services will use the HTTP response codes to update the caller as to the status of the request/response, but many Soap contracts have messages included in the Soap response, which report the status of the request, and/or a message for the caller. Since these are usually older services anyways, it isn't much use trying to debate the necessity for multiple layers of response statusing with the authors. Instead, we'll just keep that in mind and make sure we have a way to get that status information out of the Soap response without putting it into our struct. Here, MXJ helps, since it has accessor methods for its XML Map type that allow you to make a Path based request to get content out of the map.  With that, we can get the response status and status message out of the Soap response, and use them to return an error if the request wasn't successful. If you want to see a bad request, you can pass "xxxxx" for the postal code and see what happens. With these things in mind, our response handling func becomes:

```go
func convertResults(soapResponse *mxj.Map) (*WeatherInfo, error) {
	successStatus, _ := soapResponse.ValueForPath("Envelope.Body.GetCityWeatherByZIPResponse.GetCityWeatherByZIPResult.Success")
	success := successStatus.(bool)
	if !success {
		errorMessage, _ := soapResponse.ValueForPath("Envelope.Body.GetCityWeatherByZIPResponse.GetCityWeatherByZIPResult.ResponseText")
		return nil, errors.New("Error Respose " + errorMessage.(string))
	}
	weatherResult, err := soapResponse.ValueForPath("Envelope.Body.GetCityWeatherByZIPResponse.GetCityWeatherByZIPResult")
	if err != nil {
		return nil, err
	}
	var result WeatherInfo
	config := &mapstructure.DecoderConfig{
		WeaklyTypedInput: true,
		Result:           &result,
		// add a DecodeHook here if you need complex Decoding of results -> DecodeHook: yourfunc,
	}
	decoder, err := mapstructure.NewDecoder(config)
	if err != nil {
		return nil,err
	}
	if err := decoder.Decode(weatherResult); err != nil {
		return nil,err
	}
	return &result, nil
}
```
## In Conclusion

Why do any of this? Sometimes you might find yourself forced to. Does Go make it easy? Perhaps not as easy as languages that were active during the heyday of Soap like Java, but its still possible. Would you want to call a Soap service if there was a JSON equivalent? Probably not, but sometimes you don't have a choice, and when that time comes, its good to have an option.
