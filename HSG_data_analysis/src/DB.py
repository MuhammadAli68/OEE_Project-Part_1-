import pyodbc

SQL_Server = "SQL Server"
server_name = "laser_db_server"
user_id = "user"
password = ""

def connect_to_dbserver():
    # if you have user id and password then try with this connection string
    connection_string = f"DRIVER={SQL_Server};SERVER={server_name};UID={user_id};PWD={password}"

    # if using in the local system then use the following connection string
    connection_string = f"DRIVER={SQL_Server};SERVER={server_name}; Trusted_Connection=True;"

    connection= pyodbc.connect(connection_string)
    cursor = connection.cursor()

    # sql_create_database = f"CREATE DATABASE {database_name}"
    # cursor.execute(sql_create_database)

    # set_database = f"USE {database_name}"
    # cursor.execute(set_database)