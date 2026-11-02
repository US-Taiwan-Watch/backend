'use client';
import React, { useEffect, useState } from "react";
import { SelectInput, useField } from "@payloadcms/ui";

interface PeopleRoleSelectProps {
  path: string;
  label?: string;
  required?: boolean;
}

const PeopleRoleSelect: React.FC<PeopleRoleSelectProps> = ({ path, label, required, field }: any) => {
  label = label ?? (typeof field?.label === "string" ? field.label : path);
  required = required ?? field?.required;
  const { value, setValue, showError, errorMessage } = useField<any[]>({
    path,
    validate: (value) => {
      if (required && !value) {
        return "This field is required.";
      }
      return true;
    },
  });
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    []
  );

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/categories-people", {
          method: "GET",
        });
        const data = await response.json();

        const roleOptions = data.docs.map((role: any) => ({
          label: role.i18n.en.name,
          value: role.i18n.en.name,
        }));

        setOptions(roleOptions);
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };

    fetchRoles();
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
        required={required}
        showError={showError}

        onChange={(e: any) => setValue(e?.value || null)}

      />
    </div>
  );
};

export default PeopleRoleSelect;
