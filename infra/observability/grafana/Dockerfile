# Grafana com a fonte de dados e os dashboards do CI incluídos na imagem: o stack do Portainer
# corre a partir do clone do Git, sem bind mounts de ficheiros do repositório.
FROM grafana/grafana:13.2.3
COPY provisioning /etc/grafana/provisioning
COPY dashboards /etc/grafana/dashboards
