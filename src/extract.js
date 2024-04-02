//import puppeteer, { Browser, Page } from "puppeteer";
const puppeteer = require("puppeteer");
const fs = require("node:fs");

let page = null,
  browser = null,
  page_count = 4,
  start_page = 1,
  bans = [],
  jobs = [];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function login() {
  if (page == null) return;

  // Navigate to a website
  await page.goto("https://www.upwork.com/ab/account-security/login");
  //await page.waitForNavigation();
  // Input user data
  await page.type("#login_username", "login_username");
  await page.click("#login_password_continue");

  //await page.waitForNavigation();
  await delay(3000);
  //await page.waitForNetworkIdle();

  await page.type("#login_password", "login_password");
  await page.click("#login_control_continue");
  //await page.waitForNavigation();
  await delay(1000);
  await page.waitForNavigation();
  //  await page.waitForNetworkIdle();
}

async function job_search(idx) {
  await page.click(`article.job-tile:nth-child(${idx})`, { delay: 100 });
  //await delay(5000);
  let detailModal = await page.waitForSelector(
    ".air3-slider-job-details-modal"
  );
  await page.waitForNetworkIdle();

  let job = {};

  try {
    job.title = await page.$eval(
      "header.air3-card-section > h4",
      (el) => el.innerText
    );
    job.url = page.url();
    job.budget = await page.$$eval(
      '[data-test="BudgetAmount"] > p > strong',
      (values) =>
        values.length != 0
          ? values
              .map((el) => String(el.innerText).trim().substring(1))
              .join(" ~ ")
          : "?"
    );
    job.type = await page.$eval(".description", (el) =>
      el ? el.innerText : "NONE"
    );
    job.region = await page.$eval(
      '[data-qa="client-location"] > strong',
      (el) => (el ? el.innerText : "NONE")
    );
    job.skills = await page.$$eval('[slot="reference"]', (values) =>
      values.map((el) => el.innerText)
    );
    console.log(job);
    if (bans.indexOf(job.title) < 0) jobs.push(job);
  } catch (e) {
    await page.keyboard.press("Escape", { delay: 100 });
    await page.waitForNetworkIdle();
    return;
  } finally {
  }

  //let budget = await (
  //  await detailModal.$('[data-test="BudgetAmount"]')
  //).evaluate((v) => v.innerHTML);
  //console.log(budget);

  await page.keyboard.press("Escape", { delay: 100 });
  //await delay(2000);
  await detailModal.dispose();
  await page.waitForNetworkIdle();
}

(async () => {
  // Launch Puppeteer with proxy configuration
  browser = await puppeteer.launch({
    headless: false,
    args: [],
  });

  page = await browser.newPage();

  await page.setViewport({ width: 1400, height: 900 });

  await login();
  //  await browser.close();

  for (let page_idx = start_page; page_idx < page_count; page_idx++) {
    await page.goto(
      `https://www.upwork.com/nx/search/jobs/page=${page_idx}&per_page=50&sort=recency`
    );
    for (let index = 1; index <= 50; index++) {
      await page.click(`article.job-tile:nth-child(${index})`, { delay: 100 });
      await delay(4000);
      let detailModal = await page.waitForSelector(
        ".air3-slider-job-details-modal"
      );
      //await page.waitForNetworkIdle();
      

      let job = {};

      try {
        job.title = await page.$eval(
          "section.air3-card-section > h4",
          (el) => el.innerText
        );
        job.url = page.url();
        job.data = await page.$eval('.air3-card-section > [data-test="Description"] > p', 
          (el) => el ? el.innerText : "NONE");
        job.budget = await page.$$eval(
          '[data-test="BudgetAmount"] > p > strong',
          (values) =>
            values.length != 0
              ? values
                  .map((el) => String(el.innerText).trim().substring(1))
                  .join(" ~ ")
              : "?"
        );
        job.type = await page.$eval(".description", (el) =>
          el ? el.innerText : "NONE"
        );
        if (job.type == "Hourly" && String(job.budget).split(" - ").length == 1)
          job.budget += (" - " + job.budget);
        job.region = await page.$eval(
          '[data-qa="client-location"] > strong',
          (el) => (el ? el.innerText : "NONE")
        );
        job.skills = await page.$$eval('[slot="reference"]', (values) =>
          values.map((el) => el.innerText)
        );
        console.log(job);
        if (bans.indexOf(job.title) < 0) {
          jobs.push(job);
          fs.appendFileSync(
            "out.csv",
            `,"${job.title}","${job.url}","${job.skills.join("/")}","${job.budget}","${job.type}","${job.region}",\n`
          );
          fs.writeFileSync("out.json", JSON.stringify(jobs, null, 4));
        }
      } catch (e) {
        await page.keyboard.press("Escape", { delay: 100 });

        await detailModal.dispose();
        await delay(2000);
        //await page.waitForNetworkIdle();
        continue;
      } finally {
      }

      //let budget = await (
      //  await detailModal.$('[data-test="BudgetAmount"]')
      //).evaluate((v) => v.innerHTML);
      //console.log(budget);

      await page.keyboard.press("Escape", { delay: 100 });
      //await delay(2000);
      await detailModal.dispose();
      await delay(2000);
      //      await page.waitForNetworkIdle();
    }
  }
  console.log("Ended.")
  return;
})();
