import React, { useState, useRef } from "react";
import { CalendarIcon } from "../atoms/svgindex";
import PropTypes from "prop-types";

const DatePicker = (props) => {
  // const [date, setDate] = useState(() => props.initialDate || null);
  const dateInp = useRef();

  function defaultFormatFunc(date) {
    if (date) {
      const operationDate =new Date(date);
      const years = operationDate?.getFullYear();
      const month = operationDate?.getMonth() + 1;
      const _date = operationDate?.getDate();
      // console.log("find current date", _date, month, years)
      return _date && month && years ? `${_date}/${month}/${years}` : "";
    }
    return "";
  }

  const getDatePrint = () => props?.formattingFn?.(props?.date) || defaultFormatFunc(props?.date);
  const selectDate = (e) => {
    const date = e.target.value;
    // setDate(date);
    props?.onChange?.(date);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <React.Fragment>
        <input
          type="text"
          disabled={props.disabled}
          value={getDatePrint() ? getDatePrint() : ""}
          readOnly
          className={`employee-card-input ${props.disabled ? "disabled" : ""}`}
          style={{ width: "calc(100%-62px)" }}
        />
        <CalendarIcon isdisabled={props.disabled ? true : false} style={{ right: "6px", zIndex: "10", top: 6, position: "absolute" }} />
        <input
          className={`${props.disabled ? "disabled" : ""}`}
          style={{ right: "6px", zIndex: "100", top: 6, position: "absolute", opacity: 0, width: "100%" }}
          value={props.date ? props.date : ""}
          type="date"
          ref={dateInp}
          disabled={props.disabled}
          onChange={selectDate}
          defaultValue={props.defaultValue}
          min={props.min}
          max={props.max}
        />
      </React.Fragment>
    </div>
  );
};

DatePicker.propTypes = {
  disabled: PropTypes.bool,
  date: PropTypes.any,
  min: PropTypes.any,
  max: PropTypes.any,
  defaultValue: PropTypes.any,
  onChange: PropTypes.func,
};

export default DatePicker;
