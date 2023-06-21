const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;
const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server Running at http://localhost:3000/`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBandServer();

const convertStatetoResponseObject = (stateDisObject) => {
  return {
    stateId: stateDisObject.state_id,
    stateName: stateDisObject.state_name,
    population: stateDisObject.population,
    districtId: stateDisObject.district_id,
    districtName: stateDisObject.district_name,
    stateId: stateDisObject.state_id,
    cases: stateDisObject.cases,
    cured: stateDisObject.cured,
    active: stateDisObject.active,
    deaths: stateDisObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStates = `
    SELECT * FROM state;`;
  const states = await db.all(getStates);
  response.send(
    states.map((eachState) => convertStatetoResponseObject(eachState))
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getSpecificState = `
    SELECT * FROM state WHERE state_id = ${stateId};`;
  const specificState = await db.get(getSpecificState);
  response.send(convertStatetoResponseObject(specificState));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistricts = `
INSERT INTO district (district_name,
  state_id,
  cases,
  cured,
  active,
  deaths) 
  VALUES
  (
      '${districtName}',
      ${stateId},
      ${cases},
      ${cured},
      ${active},
    ${deaths},
    ;`;
  const dbResponse = await db.run(addDistricts);
  const districtId = dbResponse.lastId;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getSpecificDis = `SELECT * FROM district WHERE district_id = ${districtId};`;
  const district = await db.get(getSpecificDis);
  response.send(convertStatetoResponseObject(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const addDistrict = ({
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = request.body);
  const updateDistrictQuery = `UPDATE district SET 
  district_name = "${districtName}",
  state_id = '${stateId}',
  cases = '${cases}',
  cured = '${cured}',
  active = '${active}',
  deaths = '${deaths}'
  WHERE district_id = '${districtId}';
  `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});
const convertReportText = (dbObject) => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  };
};

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStats = `SELECT SUM(cases) as cases,
            SUM(cured) as cured,
            SUM(active) as active,
            SUM(deaths) as deaths
    FROM district 
    WHERE state_id = ${stateId};`;

  const getStatsStates = await db.get(getStats);
  console.log(getStatsStates);
  response.send(convertReportText(getStatsStates));
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateName = `SELECT state_name FROM state JOIN district
    ON state.state_id = district.state_id
    WHERE district.district_id = ${districtId};`;
  const stateName = await db.get(getStateName);
  response.send(convertStatetoResponseObject(stateName));
});
module.exports = app;
