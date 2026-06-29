import { useEffect, useState, useMemo } from "react";
import { appointmentService } from "../../services/appointmentService";
import { userService } from "../../services/userService";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Label } from "../../components/Label";
import { format } from "date-fns";
import { Calendar, Clock, User, X, CheckCircle } from "lucide-react";

// ── Validation helpers ────────────────────────────────────────────
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const validateForm = (data) => {
  const errors = {};

  if (!data.doctor) {
    errors.doctor = "Please select a doctor.";
  }

  if (!data.appointmentDate) {
    errors.appointmentDate = "Date is required.";
  } else {
    const selected = new Date(`${data.appointmentDate}T00:00:00`);
    if (selected <= today()) {
      errors.appointmentDate = "Date must be in the future.";
    }
  }

  if (!data.appointmentTime) {
    errors.appointmentTime = "Time is required.";
  } else {
    const [h, m] = data.appointmentTime.split(":").map(Number);
    const mins = h * 60 + m;
    if (mins < 9 * 60 || mins > 17 * 60) {
      errors.appointmentTime = "Time must be between 09:00 and 17:00.";
    }
  }

  if (!data.reason || data.reason.trim().length < 10) {
    errors.reason = "Reason must be at least 10 characters.";
  }

  return errors;
};

export const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    doctor: "",
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
    symptoms: "",
  });

  // Derived validation errors — re-run on every formData change
  const errors = useMemo(() => validateForm(formData), [formData]);
  const isFormValid = Object.keys(errors).length === 0;

  // Mark a field as touched on blur / change
  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    touch(field);
    setSuccessMessage("");
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { appointments: data } = await appointmentService.getAll();
      setAppointments(data);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { users } = await userService.getAll({ role: "doctor" });
      setDoctors(users);
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Touch all fields to show all errors on submit attempt
    setTouched({
      doctor: true,
      appointmentDate: true,
      appointmentTime: true,
      reason: true,
    });
    if (!isFormValid) return;

    setSubmitting(true);
    try {
      await appointmentService.create(formData);
      setSuccessMessage("✅ Appointment booked successfully!");
      setShowForm(false);
      setFormData({
        doctor: "",
        appointmentDate: "",
        appointmentTime: "",
        reason: "",
        symptoms: "",
      });
      setTouched({});
      fetchAppointments();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        await appointmentService.update(id, { status: "cancelled" });
        fetchAppointments();
      } catch (error) {
        alert(error.response?.data?.message || "Failed to cancel appointment");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground mt-2">
            Manage your medical appointments
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setSuccessMessage("");
          }}
        >
          Book Appointment
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center space-x-2 rounded-md border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4 text-green-700 dark:text-green-300">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Book New Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doctor">Doctor</Label>
                  <select
                    id="doctor"
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      touched.doctor && errors.doctor ? 'border-red-500' : 'border-input'
                    }`}
                    value={formData.doctor}
                    onChange={(e) => handleChange('doctor', e.target.value)}
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}{" "}
                        {doctor.specialization && `- ${doctor.specialization}`}
                      </option>
                    ))}
                  </select>
                  {touched.doctor && errors.doctor && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.doctor}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentDate">Date</Label>
                  <Input
                    id="appointmentDate"
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => handleChange('appointmentDate', e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    className={touched.appointmentDate && errors.appointmentDate ? 'border-red-500' : ''}
                  />
                  {touched.appointmentDate && errors.appointmentDate && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.appointmentDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentTime">Time</Label>
                  <Input
                    id="appointmentTime"
                    type="time"
                    value={formData.appointmentTime}
                    onChange={(e) => handleChange('appointmentTime', e.target.value)}
                    className={touched.appointmentTime && errors.appointmentTime ? 'border-red-500' : ''}
                  />
                  {touched.appointmentTime && errors.appointmentTime && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.appointmentTime}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleChange('reason', e.target.value)}
                    placeholder="Brief reason for visit (min 10 chars)"
                    className={touched.reason && errors.reason ? 'border-red-500' : ''}
                  />
                  {touched.reason && errors.reason && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.reason}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms (Optional)</Label>
                <textarea
                  id="symptoms"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.symptoms}
                  onChange={(e) =>
                    setFormData({ ...formData, symptoms: e.target.value })
                  }
                  placeholder="Describe your symptoms..."
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={submitting || (Object.keys(touched).length > 0 && !isFormValid)}>
                  {submitting ? 'Booking...' : 'Book Appointment'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setTouched({}); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No appointments found</p>
            </CardContent>
          </Card>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment._id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">
                        Dr. {appointment.doctor?.name}
                      </span>
                      {appointment.doctor?.specialization && (
                        <span className="text-sm text-muted-foreground">
                          - {appointment.doctor.specialization}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(
                            new Date(appointment.appointmentDate),
                            "MMM dd, yyyy",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{appointment.appointmentTime}</span>
                      </div>
                    </div>
                    {appointment.reason && (
                      <p className="text-sm">{appointment.reason}</p>
                    )}
                    {appointment.symptoms && (
                      <p className="text-sm text-muted-foreground">
                        Symptoms: {appointment.symptoms}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}
                    >
                      {appointment.status}
                    </span>
                    {appointment.status !== "cancelled" &&
                      appointment.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(appointment._id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
