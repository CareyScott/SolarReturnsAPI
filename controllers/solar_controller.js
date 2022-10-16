const axios = require("axios");

const req = require("express/lib/request");
const res = require("express/lib/response");
console.log(req);

let solarRequestData;

const solar_request = async (req, res) => {
  try {
    res = await axios
      .get("https://re.jrc.ec.europa.eu/api/v5_2/PVcalc", {
        params: {
          lat: req.body.lat_in,
          lon: req.body.lon_in,
          usehorizon: 1,
          raddatabase: "PVGIS-SARAH",
          peakpower: req.body.peakpower,
          pvtechchoice: "crystSi",
          mountingplace: "building",
          loss: req.body.loss_in,
          fixed: 1,
          angle: req.body.angle_in,
          aspect: req.body.aspect_in,
          outputformat: "json",
        },
      })
      .then((response) => {
        solarRequestData = response.data;
      });
  } catch (err) {
    console.log(err);
  }
  return solarRequestData;
};

// Function to calculate all key outputs
const data_extraction_sum = async (req, res) => {
  let solar_request_data = await solar_request(req, res);

  // Define Variables For Financial Calculations
  var daily_energy_usage = Number(req.body.daily_energy_usage);
  var self_consumption = Number(req.body.self_consumption);
  var panel_degradation_rate = Number(req.body.panel_degradation_rate);
  var system_cost_inc_grant = Number(req.body.system_cost_inc_grant);
  var system_life = Number(req.body.system_life);
  var inverter_life = Number(req.body.inverter_life);
  var inverter_cost = Number(req.body.inverter_cost);
  var discount_rate = Number(req.body.discount_rate);
  var inflation_rate = Number(req.body.inflation_rate);
  var elec_price_increase_rate = Number(req.body.elec_price_increase_rate);
  var current_day_elec_price = Number(req.body.current_day_elec_price);
  var current_night_elec_price = Number(req.body.current_night_elec_price);
  var current_elec_sale_price = Number(req.body.current_elec_sale_price);

  // console.log(panel_degradation_rate);

  // Find annual production
  // Extract Useful Data (month and production) from json of solar production
  let newArray = solar_request_data.outputs.monthly.fixed.map(
    ({ month, E_m }) => ({ month, E_m })
  );

  var initial_prod = 0;
  var monthly_production = [];
  for (let i = 0; i < newArray.length; i++) {
    monthly_production[i] = Math.round(Number(newArray[i].E_m) * 100) / 100;
    initial_prod =
      Math.round((initial_prod + Number(newArray[i].E_m)) * 100) / 100;
  }

  // Calculate annual production including panel degration
  var annual_prod = new Array(system_life);
  for (let i = 0; i < system_life; i++) {
    annual_prod[i] =
      Math.round(initial_prod * (1 - panel_degradation_rate) ** i * 100) / 100;
  }

  // Calculate Projected Electricity Costs
  let elec_day_proj = [];
  let elec_night_proj = [];
  let elec_sale_proj = [];

  for (let i = 0; i < system_life; i++) {
    elec_day_proj[i] =
      Math.round(
        current_day_elec_price *
          (1 + inflation_rate + elec_price_increase_rate) ** i *
          1000
      ) / 1000;
    elec_night_proj[i] =
      Math.round(
        current_night_elec_price *
          (1 + inflation_rate + elec_price_increase_rate) ** i *
          1000
      ) / 1000;
    elec_sale_proj[i] =
      Math.round(current_elec_sale_price * (1 + inflation_rate) ** i * 1000) /
      1000;
  }

  // Calculate the Simple Payback in Years
  // Calculate outgoing expenses
  let outgoing = new Array(system_life);
  for (let i = 0; i < system_life; i++) {
    outgoing[i] = 0;
  }
  outgoing[0] = system_cost_inc_grant;

  for (let i = 1; i <= Math.floor(system_life / inverter_life); i++) {
    outgoing[inverter_life * i] = inverter_cost;
  }

  // Calculate Incoming Revenue
  let incoming = new Array(system_life);
  for (let i = 0; i < system_life; i++) {
    incoming[i] = 0;
  }
  for (let i = 0; i < system_life; i++) {
    incoming[i] =
      annual_prod[i] * self_consumption * elec_day_proj[i] +
      annual_prod[i] * (1 - self_consumption) * elec_sale_proj[i];
  }

  // Cumulative Costs/Income
  let simple_cumulative = new Array(system_life);
  var simple_payback = 0;

  for (let i = 0; i < system_life; i++) {
    if (i == 0) {
      simple_cumulative[0] = Math.round(incoming[0] - outgoing[0]);
    } else {
      simple_cumulative[i] = Math.round(
        simple_cumulative[i - 1] + incoming[i] - outgoing[i]
      );
    }
  }
  for (let i = 0; i < system_life; i++) {
    if (simple_cumulative[i] >= 0) {
      simple_payback = i + 1;
      break;
    }
  }

  // Calculate Net Present Value of Investment
  // Multiply incoming and outgoing arrays by disount factor formula then sum all elements of the two arrays
  // Formula = (Net cash flow at time t)/(1+ discount factor)^t
  let discount_outgoing = new Array(system_life);
  let discount_incoming = new Array(system_life);
  var net_present_value = 0;

  for (let i = 0; i < system_life; i++) {
    discount_outgoing[i] = outgoing[i] / (1 + discount_rate) ** i;
    discount_incoming[i] = incoming[i] / (1 + discount_rate) ** (i + 1);
    net_present_value = Math.round(
      net_present_value - discount_outgoing[i] + discount_incoming[i]
    );
  }

  // key outputs that will need to be returned to the front end are; monthly_production (array),
  // annual_prod (int), incoming (array), outgoing (array), simple_cumulative (array),
  // simple_payback (int),discount_outgoing (array), discount_incoming(array), net_present_value(int)
  let json_calc_results = {
    monthly_production: monthly_production,
    annual_production: annual_prod,
    simple_cumulative: simple_cumulative,
    simple_payback: simple_payback,
    net_present_value: net_present_value,
  };

  // console.log(json_calc_results);
  // console.log(simple_payback);
  // console.log(net_present_value);
  // console.log(initial_prod);

  if (json_calc_results) {
    // filters predictions probability threshold

    // return predicted array
    res.status(200).json(json_calc_results);
    console.log("done");
  } else {
    res.status(404).json("No calculation can be made");
  }
  // .catch((err) => {
  //   console.error(err);
  //   res.status(500).json(err);
  // });
};

module.exports = {
  solar_request,
  data_extraction_sum,
};


// Adding all of your changes to the github commit
// git add . 


//Committing && adding a message to the working branch
// git commit -m "YOUR MESSAGE HERE"

//Pushing to repository
// git push -u origin main