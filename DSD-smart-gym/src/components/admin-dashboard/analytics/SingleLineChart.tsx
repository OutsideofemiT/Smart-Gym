import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { coordinateProps } from "../../../types/Analytics.interface.ts";

const SingleLineChart: React.FC<{ data: coordinateProps[] }> = ({ data }) => {
  return (
    <AreaChart width={900} height={400} data={data}>
      <CartesianGrid />
      <Area dataKey="y" stroke="#bcfd4c" fill="#bcfd4c" />
      <XAxis dataKey="x" />
      <YAxis />
    </AreaChart>
  );
};

export default SingleLineChart;
