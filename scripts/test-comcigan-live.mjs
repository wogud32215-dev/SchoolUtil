import { searchComciganSchools, fetchTimetableJson } from "../electron/comcigan/direct.ts";
import {
  listTeachersFromTimetableJson,
  parseFullTimetable,
} from "../electron/comcigan/parse.ts";

const schools = await searchComciganSchools("이천제일");
console.log("schools", schools);
const { jsonText, routes } = await fetchTimetableJson(schools[0].schoolCode, 1);
console.log("routes", routes);
const teachers = listTeachersFromTimetableJson(jsonText, routes.teacherCode);
console.log("teacher count", teachers.length, teachers.slice(0, 3));
const full = parseFullTimetable(jsonText, routes);
console.log("grades", full.length, "classes g1", full[0]?.length);
const cell = full[0]?.[0]?.[0]?.[0];
if (cell) console.log("sample", cell);