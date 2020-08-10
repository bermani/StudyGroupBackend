// Android push test
// To be used with:
// https://github.com/codepath/ParsePushNotificationExample
// See https://github.com/codepath/ParsePushNotificationExample/blob/master/app/src/main/java/com/test/MyCustomReceiver.java

Parse.Cloud.define('pushChannelTest', function(request, response) {

  // request has 2 parameters: params passed by the client and the authorized user
  var params = request.params;
  var user = request.user;

  var customData = params.customData;
  var launch = params.launch;
  var broadcast = params.broadcast;

  // use to custom tweak whatever payload you wish to send
  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.equalTo("deviceType", "android");

  var payload = {};

  if (customData) {
      payload.customdata = customData;
  }
  else if (launch) {
      payload.launch = launch;
  }
  else if (broadcast) {
      payload.broadcast = broadcast;
  }

  // Note that useMasterKey is necessary for Push notifications to succeed.

  Parse.Push.send({
  where: pushQuery,      // for sending to a specific channel
  data: payload,
  }, { success: function() {
     console.log("#### PUSH OK");
  }, error: function(error) {
     console.log("#### PUSH ERROR" + error.message);
  }, useMasterKey: true});

  response.success('success');
});

// iOS push testing
Parse.Cloud.define("iosPushTest", function(request, response) {

  // request has 2 parameters: params passed by the client and the authorized user                                                                                                                               
  var params = request.params;
  var user = request.user;

  // Our "Message" class has a "text" key with the body of the message itself                                                                                                                                    
  var messageText = params.text;

  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.equalTo('deviceType', 'ios'); // targeting iOS devices only                                                                                                                                          

  Parse.Push.send({
    where: pushQuery, // Set our Installation query                                                                                                                                                              
    data: {
      alert: "Message: " + messageText
    }
  }, { success: function() {
      console.log("#### PUSH OK");
  }, error: function(error) {
      console.log("#### PUSH ERROR" + error.message);
  }, useMasterKey: true});

  response.success('success');
});

Parse.Cloud.define("updateCountEnrolled", async (request) => {
  const userQuery = new Parse.Query("User")
  userQuery.equalTo("enrolled",request.params.courseId)
  const count = await userQuery.count()

  const courseQuery = new Parse.Query("Course")
  const course = await courseQuery.get(request.params.courseId)
  course.set("enrolledCount", count)
  await course.save()
  return count;
})

Parse.Cloud.beforeSave("TextPost", async (request) => {
  const post = request.object
  const course = await post.get("course").fetch()
  const reports = post.get("reports")
  if (reports) {
    const ratio = reports.length / course.get("enrolledCount")
    if (ratio > 0.51) {
      post.destroy()
    }
  }
})

Parse.Cloud.beforeSave("Assignment", async (request) => {
  const post = request.object
  const course = await post.get("course").fetch()
  const reports = post.get("reportUsers")
  if (reports) {
    const ratio = reports.length / course.get("enrolledCount")
    if (ratio > 0.51) {
      post.destroy()
    }
  }
})

Parse.Cloud.job("reminders", async (request) => {
  const userQuery = new Parse.Query("User");
  userQuery.include("subscribedAssignments");
  const users = await userQuery.find();
  for (const user of users) {
    const a = user.get("subscribedAssignments");
    if (a && a.length > 0) {
      const assignmentQuery = new Parse.Query("Assignment");
      assignmentQuery.containedIn("objectId", a);
      assignmentQuery.greaterThan("dueDate", new Date());
      assignmentQuery.addAscending("dueDate");
      const assignments = await assignmentQuery.find();
      if (assignments && assignments.length > 0) {
        let nextAssignment = assignments[0];
        console.log(nextAssignment.get("title"));
        const pushQuery = new Parse.Query(Parse.Installation);
        pushQuery.matchesQuery("user", user);
        Parse.Push.send(
          {
            where: {
              deviceType: {
                $in: ["ios", "android"],
              },
            },
            data: {
              title: "StudyGroup",
              alert: `Your assignment "${nextAssignment.get(
                "title"
              )}" is coming up`,
            },
          },
          { useMasterKey: true }
        ).then(
          function () {
            console.log("yes");
          },
          function (error) {
            console.log("no");
          }
        );
      }
    }
  }
});