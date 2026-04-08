import CountUp from "react-countup";

export const Odometer = ({value}:{value:any}) => {
  return (
    <CountUp
      end={value}
      duration={6}
      separator=","
      useEasing={true}
    />
  );
};