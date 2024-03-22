## Group ID Tracker for Online Survey Tools

by Luzie Ahrens

This project offers a solution for providing and keeping track of group IDs for the participants of an online survey.

### Overview

Sometimes when a questionaire is carried out, researchers have different groups with different items for the participants. For example, the first group of participants is supposed to look at pictures from item group one, and the second group of participants is supposed to look at pictures from item group two. This can get very complex very fast, for example if there are 500 items, 500 participants and each participant is supposed to look at exactly ten out of the 500. This results in 50 item groups and each one is supposed to be filled with ten participants.

Currently, some online survey tools - like LimeSurvey - do not offer a solution for assigning exactly X participants to one of N groups. This project offers a solution.

### Functionality

For the sake of keeping track of IDs as well as giving out new ones, a json file is created. Inside this json-file, there is one key for each of the possible groups, with the value being the number of times this ID has been used (`0` for all in the beginning). The json-file also contains information about the total number of groups and the number of participants that are needed to fill each group.

To get access to a new group-ID from within another website, a server needs to be set up and run a Node.js application. The application loads the data from the json-file and stores it in a dictionary. The app allows HTTPS-requests and - upon an incoming request - checks the dictionary for free group-IDs. It sends back a HTTPS-response with the new group-ID in the body. This ID can now be used by the requesting website. I recommend setting a session storage variable with javascript to later on get access to this variable in other tabs and webpages. More explanation about this can be found down below.

When the questionaire is finished, another HTTPS-requests needs to be send to the server in order to confirm that a participant has used and finished the questionaire with the given group-ID. In this case, a POST-requests needs to be send from the website with the group-ID in the body. The json-file that keeps track of the IDs is then updated and overwritten (with the value of the specified group-ID being updated by one). More explanation about this can be found down below.

A complete overview of the functionality is provided by the picture below.

![server client](server.png)

### Getting started

First, you need to run `create_ids.py` to create a dictionary. In the python file, set the variables `start`, `end` and `fill` to the specific numbers needed for your questionaire.

Next up, you need to set up a server. The server needs to have an SSL-certificate in order to run and serve HTTPS. This is necessary to make requests possible that are coming from within another website (i.e. via javascript). Your server also needs to be open for incoming requests on the port you're going to use (default `3000`).

In the file `run.js`, specify the path to your ssl-key-file and ssl-cert-file.

Make sure you have installed [Node.js](https://nodejs.org/en/download).

Run `npm install` to install the necessary node packages.

Run `node run.js` to start the webserver.

### Requesting new IDs

Once the server is started, you can request new IDs. 

To request IDs from within another website, you can use the following Javascript code.

```js
// url to fetch ID (replace your-ip-address and port)
var url = "https://your-ip-address:port"

fetch(url).then(function(response) {
  return response.json();

}).then(function(data) {

    // set session storage variable
    sessionStorage.setItem('group_id', data);    

    // optional: set innerHTML of a given element
    const folder_id_element = document.getElementById("your_html_element");
    folder_id_element.innerHTML = data;

}).catch(function(err) { console.log('Fetch Error :-S', err); });
```

### Using your ID

You can use the session storage variable to get your ID again.

```js
// get ID from session storage
var group_id = sessionStorage.getItem('group_id');

// use variable to get specified file from folder
var file = "/upload/surveys/123456/files/" + group_id + "/1.mp3"

// set source of audio element to file
var audio_source_element = document.getElementById("your_audio_source_id");
audio_source_element.src = file;
```

The HTML-code for an audio file could look like this:

```HTML
<p><span style="font-size:16px;">Click ► to play.</span></p>

<audio controls="" id="myaudio"><source id="your_audio_source_id" src="" type="audio/mp3" /></audio>
```

### Confirming the ID has been used

At the very end of your questionaire, you need to let the server know the ID has been used. You can use the following code to send a POST-request to the server.

```js
// url of your server (replace your-ip-address and port)
url = "https://your-ip-address:port"

used_id = sessionStorage.getItem('group_id');

fetch(url, {
    method: 'POST',
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: used_id })
})
   .then(response => response.json())
   .then(response => console.log(JSON.stringify(response)))
```
The body of the POST-request needs to be in json-format and have a key called `user_id` which is the ID that has been used by the participant in the survey.

#### What if someone starts the questionaire but doesn't finish?

The server will not know if someone has cancelled the questionaire. All the server knows is that a group-ID has been given out but no confirmation has been received. This is okay, because only upon receival of a confirmation, the group-ID counter (in the json file) will be overwritten. However, any group-ID that has been given out is blocked from being used again. In order to counter questionaire cancellations, the server should be restarted every now and then.

#### In what order are the groups filled with participants?

The current implementation fills the first group first, then moves on to the second, fills that one fully, and so on. Groups with higher group-IDs will therefore only be used once the lower groups are full.

#### Where and how do I set up a webserver?

I recommend any public webhosting service, like IONOS, Strato or dogado. You will have to pay a small fee, also to get an ssl certificate. You do not need a domain name. On your server, pull this git repo and add your ssl-certificate and ssl-key. Adjust the paths in `run.js`. Open the port (default 3000) for incoming requests on the server.


##### Contact

Luzie Ahrens

Mail: luzie.ahrens@gmail.com