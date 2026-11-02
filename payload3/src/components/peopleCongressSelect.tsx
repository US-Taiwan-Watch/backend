'use client';
import React, { useEffect, useState } from "react";
import { SelectInput, useField } from "@payloadcms/ui";

interface PeopleCongressSelectProps {
  path: string;
  label?: string;
  required?: boolean;
}

const PeopleCongressSelect: React.FC<PeopleCongressSelectProps> = ({ path, label, required, field }: any) => {
  label = label ?? (typeof field?.label === "string" ? field.label : path);
  required = required ?? field?.required;
  const { value, setValue, showError, errorMessage } = useField<any[]>({
    path,
    validate: (value) => {
      if (required && (!value || value.length === 0)) {
        return "You must select at least one congress number.";
      }
      return true;
    },
  });
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const generateCongressOptions = () => {
      const currentYear = new Date().getFullYear();
      const baseCongress = 118; // 118th Congress starts from 2023
      const baseYear = 2023;

      const currentCongress =
        baseCongress + Math.floor((currentYear - baseYear) / 2);

      const congressOptions = Array.from(
        { length: currentCongress - 60 + 1 },
        (_, i) => {
          const congressNumber = 60 + i;
          return {
            label: congressNumber.toString(),
            value: congressNumber,
          };
        }
      );

      return congressOptions;
    };

    setOptions(generateCongressOptions());
  }, []);

  return (
    <div>
      <label className="field-label">
        {label} {required && <span style={{ color: "#FF6F76", marginLeft: "4px" }}>*</span>}
      </label>
      <SelectInput
        path={path}
        name={path}
        options={options}
        value={value}
        hasMany={true}
        required={required}
        showError={showError}

        onChange={(options: any) => setValue(options.map((option) => option.value))}

      />
    </div>
  );
};

export default PeopleCongressSelect;
