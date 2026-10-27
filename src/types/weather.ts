export type WeatherSnapshot = {
  temp: number | null;
  code: number | null;
  wind: number | null;
};

export type WeatherHourlyRow = {
  time: string;
  temp: number | null;
  code: number | null;
  precipProbability: number | null;
};

export type WeatherDailyRow = {
  date: string;
  tempMin: number | null;
  tempMax: number | null;
  code: number | null;
};

export type WeatherForecastData = {
  current: WeatherSnapshot;
  hourlyToday: WeatherHourlyRow[];
  daily: WeatherDailyRow[];
};
