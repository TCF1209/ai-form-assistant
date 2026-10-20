from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Page-number pagination that lets the client ask for bigger pages with ?page_size=."""

    page_size_query_param = 'page_size'
    max_page_size = 1000
