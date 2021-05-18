const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const {config} = require("./config");

function sendEmail(transport, data) {
  const message = {
    from: config.email.from,
    to: config.email.to,
    subject: "Vaccine Availability Alert!!!!",
    text: data,
  };
  transport.sendMail(message, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
}

const centerIdMap = config.filter.centerIds && config.filter.centerIds.length && config.filter.centerIds.reduce((cId, obj) => obj[cId]=true, {});

const zeroPad = (num, places) => String(num).padStart(places, "0");

(async function () {
  const date = new Date();
  const filterDate = `${zeroPad(date.getDate(), 2)}-${zeroPad(
    date.getMonth()+1,
    2
  )}-${date.getFullYear()}`;
  let transport = nodemailer.createTransport({
    host: config.email.auth.host,
    port: config.email.auth.port,
    auth: {
      user: config.email.auth.user,
      pass: config.email.auth.pass,
    },
  });

  while (true) {
    console.log('looking for pin = ' + config.filter.pin + ' date = ' + filterDate);
    fetch(
      `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${config.filter.district}&date=${filterDate}`,
      {
        credentials: "omit",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.5",
        },
        referrer: "https://www.cowin.gov.in/",
        method: "GET",
        mode: "cors",
      }
    )
      .then((res) => res.json())
      .then((data) => {
        data.centers
        .filter(c => (!centerIdMap) || centerIdMap[c.center_id])
        .forEach((center) => {
          const availability = center.sessions.reduce(
            (c, sess) => c + sess.available_capacity,
            0
          );
          console.log(center.name, availability);
          if (availability > 0)
            sendEmail(
              transport,
              `Vaccine available at ${center.name}, amount: ${availability}`
            );
        });
        console.log();
        console.log("-----------------------------------");
        console.log();
      });
    await new Promise((r) => setTimeout(r, 30000));
  }
})();
